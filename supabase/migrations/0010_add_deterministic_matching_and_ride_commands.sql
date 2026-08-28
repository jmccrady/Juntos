create type public.ride_assignment_status as enum ('offered','accepted','declined','cancelled','completed');

create table public.ride_candidates (
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  availability_id uuid not null references public.driver_availability(id) on delete cascade,
  driver_display_name text not null,
  vehicle_label text not null,
  seat_capacity smallint not null,
  languages text[] not null,
  language_match boolean not null,
  capacity_margin smallint not null,
  score integer not null,
  match_rank smallint not null,
  generated_at timestamptz not null default now(),
  primary key (ride_request_id, driver_id),
  constraint ride_candidates_capacity_margin_nonnegative check (capacity_margin >= 0),
  constraint ride_candidates_rank_positive check (match_rank > 0)
);

create table public.ride_assignments (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null unique references public.ride_requests(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  status public.ride_assignment_status not null default 'offered',
  assigned_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.ride_events (
  id bigint generated always as identity primary key,
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('candidates_refreshed','driver_offered','driver_accepted','driver_declined','driver_arrived','ride_started','ride_completed','ride_cancelled')),
  old_status public.ride_status,
  new_status public.ride_status,
  reason_code text,
  created_at timestamptz not null default now(),
  constraint ride_events_reason_code_format check (reason_code is null or reason_code ~ '^[a-z0-9_-]{1,40}$')
);

create index ride_candidates_dispatch_idx on public.ride_candidates (ride_request_id, match_rank, score desc);
create index ride_candidates_driver_idx on public.ride_candidates (driver_id, generated_at desc);
create index ride_assignments_driver_status_idx on public.ride_assignments (driver_id, status, assigned_at desc);
create index ride_events_ride_created_idx on public.ride_events (ride_request_id, created_at);

alter table public.ride_candidates enable row level security;
alter table public.ride_assignments enable row level security;
alter table public.ride_events enable row level security;

revoke all on public.ride_candidates from anon, authenticated;
revoke all on public.ride_assignments from anon, authenticated;
revoke all on public.ride_events from anon, authenticated;
grant select on public.ride_candidates to authenticated;
grant select on public.ride_assignments to authenticated;
grant select on public.ride_events to authenticated;

create policy "ride_candidates_dispatch_select" on public.ride_candidates
  for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('dispatcher','admin')));

create policy "ride_assignments_authorized_select" on public.ride_assignments
  for select to authenticated
  using (
    driver_id = (select auth.uid())
    or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('dispatcher','admin'))
  );

create policy "ride_events_authorized_select" on public.ride_events
  for select to authenticated
  using (
    exists (select 1 from public.ride_requests rr where rr.id = ride_request_id and rr.rider_id = (select auth.uid()))
    or exists (select 1 from public.ride_assignments ra where ra.ride_request_id = ride_request_id and ra.driver_id = (select auth.uid()))
    or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('dispatcher','admin'))
  );

drop policy if exists "ride_requests_authorized_select" on public.ride_requests;
create policy "ride_requests_authorized_select" on public.ride_requests
  for select to authenticated
  using (
    (select auth.uid()) = rider_id
    or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('dispatcher','admin'))
    or exists (
      select 1 from public.ride_assignments ra
      where ra.ride_request_id = id
        and ra.driver_id = (select auth.uid())
        and ra.status in ('offered','accepted','completed')
    )
  );

create or replace function public.refresh_ride_candidates(p_ride_request_id uuid)
returns integer language plpgsql security definer set search_path = pg_catalog as $$
declare v_actor uuid := auth.uid(); v_count integer := 0;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role in ('dispatcher','admin')) then raise exception 'dispatcher role required'; end if;
  if not exists (select 1 from public.ride_requests rr where rr.id = p_ride_request_id and rr.status = 'requested') then raise exception 'ride is not available for matching'; end if;
  delete from public.ride_candidates where ride_request_id = p_ride_request_id;
  if not exists (select 1 from public.ride_requests rr where rr.id = p_ride_request_id and rr.pickup_region_id is not null) then
    insert into public.ride_events (ride_request_id, actor_id, event_type, old_status, new_status) values (p_ride_request_id, v_actor, 'candidates_refreshed', 'requested', 'requested');
    return 0;
  end if;

  with ride as (
    select rr.*, rp.preferred_language from public.ride_requests rr left join public.profiles rp on rp.id = rr.rider_id where rr.id = p_ride_request_id and rr.status = 'requested'
  ), eligible as (
    select dp.user_id as driver_id, v.id as vehicle_id, da.id as availability_id,
      coalesce(nullif(dp_profile.display_name, ''), 'Volunteer • ' || left(dp.user_id::text, 8)) as driver_display_name,
      trim(concat_ws(' ', v.model_year::text, v.color, v.make, v.model)) as vehicle_label,
      v.seat_capacity, dp.languages,
      coalesce(ride.preferred_language = any(dp.languages), false) as language_match,
      (v.seat_capacity - ride.rider_count)::smallint as capacity_margin,
      (100 + case when coalesce(ride.preferred_language = any(dp.languages), false) then 20 else 0 end + greatest(0, 10 - (v.seat_capacity - ride.rider_count)))::integer as score,
      row_number() over (partition by dp.user_id order by case when coalesce(ride.preferred_language = any(dp.languages), false) then 0 else 1 end, (v.seat_capacity - ride.rider_count), da.starts_at desc, v.id, da.id) as driver_choice
    from ride
    join public.driver_profiles dp on dp.service_region_id = ride.pickup_region_id and dp.is_accepting_rides
    join private.driver_verification dv on dv.user_id = dp.user_id and dv.status = 'verified' and dv.license_status = 'valid' and dv.insurance_status = 'valid' and dv.background_status = 'clear'
    join public.vehicles v on v.driver_id = dp.user_id and v.active and v.seat_capacity >= ride.rider_count
    join private.vehicle_verification vv on vv.vehicle_id = v.id and vv.status = 'approved'
    join public.driver_availability da on da.driver_id = dp.user_id and coalesce(da.service_region_id, dp.service_region_id) = ride.pickup_region_id and da.starts_at <= ride.requested_at and da.ends_at >= ride.requested_at
    left join public.profiles dp_profile on dp_profile.id = dp.user_id
    where not exists (
      select 1 from public.ride_assignments existing_assignment
      join public.ride_requests existing_ride on existing_ride.id = existing_assignment.ride_request_id
      where existing_assignment.driver_id = dp.user_id and existing_assignment.status in ('offered','accepted')
        and existing_ride.requested_at between ride.requested_at - interval '2 hours' and ride.requested_at + interval '2 hours'
    )
  ), chosen as (select * from eligible where driver_choice = 1),
  ranked as (select chosen.*, row_number() over (order by score desc, capacity_margin asc, driver_id)::smallint as match_rank from chosen)
  insert into public.ride_candidates (ride_request_id, driver_id, vehicle_id, availability_id, driver_display_name, vehicle_label, seat_capacity, languages, language_match, capacity_margin, score, match_rank, generated_at)
  select p_ride_request_id, driver_id, vehicle_id, availability_id, driver_display_name, vehicle_label, seat_capacity, languages, language_match, capacity_margin, score, match_rank, now() from ranked;
  get diagnostics v_count = row_count;
  insert into public.ride_events (ride_request_id, actor_id, event_type, old_status, new_status) values (p_ride_request_id, v_actor, 'candidates_refreshed', 'requested', 'requested');
  return v_count;
end; $$;

create or replace function public.assign_ride(p_ride_request_id uuid, p_driver_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare v_actor uuid := auth.uid(); v_vehicle_id uuid; v_assignment_id uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role in ('dispatcher','admin')) then raise exception 'dispatcher role required'; end if;
  delete from public.ride_assignments where ride_request_id = p_ride_request_id and status in ('declined','cancelled');
  if exists (select 1 from public.ride_assignments where ride_request_id = p_ride_request_id) then raise exception 'ride already has an active assignment'; end if;
  select c.vehicle_id into v_vehicle_id
  from public.ride_candidates c
  join public.ride_requests rr on rr.id = c.ride_request_id
  join public.driver_profiles dp on dp.user_id = c.driver_id
  join private.driver_verification dv on dv.user_id = c.driver_id
  join public.vehicles v on v.id = c.vehicle_id
  join private.vehicle_verification vv on vv.vehicle_id = c.vehicle_id
  join public.driver_availability da on da.id = c.availability_id
  where c.ride_request_id = p_ride_request_id and c.driver_id = p_driver_id and c.generated_at >= now() - interval '15 minutes'
    and rr.status = 'requested' and rr.pickup_region_id is not null and dp.service_region_id = rr.pickup_region_id and dp.is_accepting_rides
    and dv.status = 'verified' and dv.license_status = 'valid' and dv.insurance_status = 'valid' and dv.background_status = 'clear'
    and v.active and v.driver_id = p_driver_id and v.seat_capacity >= rr.rider_count and vv.status = 'approved'
    and da.driver_id = p_driver_id and coalesce(da.service_region_id, dp.service_region_id) = rr.pickup_region_id and da.starts_at <= rr.requested_at and da.ends_at >= rr.requested_at
  limit 1;
  if v_vehicle_id is null then raise exception 'candidate is stale or no longer eligible'; end if;
  insert into public.ride_assignments (ride_request_id, driver_id, vehicle_id, assigned_by, status) values (p_ride_request_id, p_driver_id, v_vehicle_id, v_actor, 'offered') returning id into v_assignment_id;
  update public.ride_requests set status = 'matched' where id = p_ride_request_id and status = 'requested';
  if not found then raise exception 'ride state changed during assignment'; end if;
  insert into public.ride_events (ride_request_id, actor_id, event_type, old_status, new_status) values (p_ride_request_id, v_actor, 'driver_offered', 'requested', 'matched');
  return v_assignment_id;
end; $$;

create or replace function public.respond_to_ride_offer(p_ride_request_id uuid, p_accept boolean)
returns public.ride_status language plpgsql security definer set search_path = pg_catalog as $$
declare v_actor uuid := auth.uid(); v_assignment public.ride_assignments%rowtype; v_new_status public.ride_status;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  select * into v_assignment from public.ride_assignments where ride_request_id = p_ride_request_id and driver_id = v_actor and status = 'offered' for update;
  if not found then raise exception 'no active offer for this driver'; end if;
  if p_accept then
    update public.ride_assignments set status = 'accepted', responded_at = now(), updated_at = now() where id = v_assignment.id;
    update public.ride_requests set status = 'accepted' where id = p_ride_request_id and status = 'matched';
    if not found then raise exception 'ride is no longer awaiting acceptance'; end if;
    insert into public.ride_events (ride_request_id, actor_id, event_type, old_status, new_status) values (p_ride_request_id, v_actor, 'driver_accepted', 'matched', 'accepted');
    v_new_status := 'accepted';
  else
    update public.ride_assignments set status = 'declined', responded_at = now(), updated_at = now() where id = v_assignment.id;
    update public.ride_requests set status = 'requested' where id = p_ride_request_id and status = 'matched';
    if not found then raise exception 'ride is no longer awaiting acceptance'; end if;
    delete from public.ride_candidates where ride_request_id = p_ride_request_id and driver_id = v_actor;
    insert into public.ride_events (ride_request_id, actor_id, event_type, old_status, new_status) values (p_ride_request_id, v_actor, 'driver_declined', 'matched', 'requested');
    v_new_status := 'requested';
  end if;
  return v_new_status;
end; $$;

create or replace function public.advance_ride(p_ride_request_id uuid, p_target public.ride_status)
returns public.ride_status language plpgsql security definer set search_path = pg_catalog as $$
declare v_actor uuid := auth.uid(); v_current public.ride_status; v_is_dispatch boolean := false; v_is_driver boolean := false; v_event text;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  select exists (select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role in ('dispatcher','admin')) into v_is_dispatch;
  select exists (select 1 from public.ride_assignments ra where ra.ride_request_id = p_ride_request_id and ra.driver_id = v_actor and ra.status = 'accepted') into v_is_driver;
  if not (v_is_dispatch or v_is_driver) then raise exception 'assigned driver or dispatcher role required'; end if;
  select status into v_current from public.ride_requests where id = p_ride_request_id for update;
  if not found then raise exception 'ride not found'; end if;
  if not ((v_current = 'accepted' and p_target = 'arrived') or (v_current = 'arrived' and p_target = 'in_progress') or (v_current = 'in_progress' and p_target = 'completed')) then raise exception 'invalid ride state transition'; end if;
  update public.ride_requests set status = p_target where id = p_ride_request_id;
  if p_target = 'arrived' then v_event := 'driver_arrived'; end if;
  if p_target = 'in_progress' then v_event := 'ride_started'; end if;
  if p_target = 'completed' then v_event := 'ride_completed'; update public.ride_assignments set status = 'completed', completed_at = now(), updated_at = now() where ride_request_id = p_ride_request_id and status = 'accepted'; end if;
  insert into public.ride_events (ride_request_id, actor_id, event_type, old_status, new_status) values (p_ride_request_id, v_actor, v_event, v_current, p_target);
  return p_target;
end; $$;

create or replace function public.cancel_ride(p_ride_request_id uuid, p_reason_code text default null)
returns public.ride_status language plpgsql security definer set search_path = pg_catalog as $$
declare v_actor uuid := auth.uid(); v_current public.ride_status; v_rider_id uuid; v_is_dispatch boolean := false;
begin
  if v_actor is null then raise exception 'authentication required'; end if;
  if p_reason_code is not null and p_reason_code !~ '^[a-z0-9_-]{1,40}$' then raise exception 'invalid reason code'; end if;
  select rider_id, status into v_rider_id, v_current from public.ride_requests where id = p_ride_request_id for update;
  if not found then raise exception 'ride not found'; end if;
  select exists (select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role in ('dispatcher','admin')) into v_is_dispatch;
  if v_actor = v_rider_id then if v_current not in ('requested','matched','accepted') then raise exception 'rider cannot cancel ride in this state'; end if;
  elsif v_is_dispatch then if v_current not in ('requested','matched','accepted','arrived') then raise exception 'dispatcher cannot cancel ride in this state'; end if;
  else raise exception 'not authorized to cancel this ride'; end if;
  update public.ride_assignments set status = 'cancelled', updated_at = now() where ride_request_id = p_ride_request_id and status in ('offered','accepted');
  update public.ride_requests set status = 'cancelled' where id = p_ride_request_id;
  insert into public.ride_events (ride_request_id, actor_id, event_type, old_status, new_status, reason_code) values (p_ride_request_id, v_actor, 'ride_cancelled', v_current, 'cancelled', p_reason_code);
  return 'cancelled';
end; $$;

revoke all on function public.refresh_ride_candidates(uuid) from public, anon, authenticated;
revoke all on function public.assign_ride(uuid, uuid) from public, anon, authenticated;
revoke all on function public.respond_to_ride_offer(uuid, boolean) from public, anon, authenticated;
revoke all on function public.advance_ride(uuid, public.ride_status) from public, anon, authenticated;
revoke all on function public.cancel_ride(uuid, text) from public, anon, authenticated;
grant execute on function public.refresh_ride_candidates(uuid) to authenticated;
grant execute on function public.assign_ride(uuid, uuid) to authenticated;
grant execute on function public.respond_to_ride_offer(uuid, boolean) to authenticated;
grant execute on function public.advance_ride(uuid, public.ride_status) to authenticated;
grant execute on function public.cancel_ride(uuid, text) to authenticated;

comment on table public.ride_candidates is 'Deterministic dispatcher-only candidate snapshots. Candidate generation does not expose exact rider addresses.';
comment on table public.ride_assignments is 'Controlled driver offers/assignments. Direct client writes are denied; state changes use validated RPC functions.';
comment on table public.ride_events is 'Append-only operational state history with reason codes only; do not store precise locations or free-text incident details here.';
