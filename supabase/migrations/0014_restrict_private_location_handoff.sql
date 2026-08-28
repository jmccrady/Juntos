-- Exact private locations are written only through a server-only command after
-- a driver has accepted the ride. Browser clients retain read access only where
-- explicit RLS policies authorize it.

revoke insert, update, delete on public.ride_private_locations from authenticated;
grant select on public.ride_private_locations to authenticated;
grant select, insert, update, delete on public.ride_private_locations to service_role;

drop policy if exists "private_locations_owner_select" on public.ride_private_locations;
drop policy if exists "private_locations_owner_insert" on public.ride_private_locations;
drop policy if exists "private_locations_owner_update" on public.ride_private_locations;

create policy "private_locations_authorized_select" on public.ride_private_locations
  for select to authenticated
  using (
    retained_until > now()
    and (
      rider_id = (select auth.uid())
      or exists (
        select 1
        from public.ride_assignments ra
        join public.ride_requests rr on rr.id = ra.ride_request_id
        where ra.ride_request_id = ride_private_locations.ride_request_id
          and ra.driver_id = (select auth.uid())
          and ra.status = 'accepted'
          and rr.status in ('accepted','arrived','in_progress')
      )
      or exists (
        select 1
        from public.user_roles ur
        join public.ride_requests rr on rr.id = ride_private_locations.ride_request_id
        where ur.user_id = (select auth.uid())
          and ur.role in ('dispatcher','admin')
          and rr.status in ('accepted','arrived','in_progress')
      )
    )
  );

create or replace function public.set_private_ride_location(
  p_actor_id uuid,
  p_ride_request_id uuid,
  p_pickup_address text,
  p_destination_address text
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_ride public.ride_requests%rowtype;
  v_pickup text := nullif(btrim(p_pickup_address), '');
  v_destination text := nullif(btrim(p_destination_address), '');
  v_retained_until timestamptz;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;

  select * into v_ride
  from public.ride_requests
  where id = p_ride_request_id
  for update;

  if not found then raise exception 'ride not found'; end if;
  if v_ride.rider_id <> p_actor_id then raise exception 'ride owner required'; end if;
  if v_ride.status <> 'accepted' then raise exception 'private location can be submitted only after driver acceptance'; end if;

  if v_ride.pickup_hub_id is null and v_pickup is null then
    raise exception 'private pickup address required when no trusted hub is selected';
  end if;
  if v_destination is null then raise exception 'destination address required'; end if;
  if v_pickup is not null and char_length(v_pickup) > 240 then raise exception 'pickup address too long'; end if;
  if char_length(v_destination) > 240 then raise exception 'destination address too long'; end if;

  v_retained_until := greatest(v_ride.requested_at + interval '24 hours', now() + interval '24 hours');

  insert into public.ride_private_locations (
    ride_request_id, rider_id, pickup_address, destination_address, retained_until
  ) values (
    p_ride_request_id, p_actor_id,
    case when v_ride.pickup_hub_id is null then v_pickup else null end,
    v_destination,
    v_retained_until
  )
  on conflict (ride_request_id) do update
    set pickup_address = excluded.pickup_address,
        destination_address = excluded.destination_address,
        retained_until = excluded.retained_until
    where public.ride_private_locations.rider_id = p_actor_id;
end;
$$;

revoke all on function public.set_private_ride_location(uuid, uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.set_private_ride_location(uuid, uuid, text, text) to service_role;

create or replace function public.enforce_private_location_retention_on_ride_state()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.status = old.status then return new; end if;

  if new.status = 'cancelled' then
    delete from public.ride_private_locations
    where ride_request_id = new.id;
  elsif new.status = 'completed' then
    update public.ride_private_locations
    set retained_until = least(retained_until, now() + interval '2 hours')
    where ride_request_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists ride_private_location_retention on public.ride_requests;
create trigger ride_private_location_retention
after update of status on public.ride_requests
for each row
when (old.status is distinct from new.status)
execute function public.enforce_private_location_retention_on_ride_state();

revoke all on function public.enforce_private_location_retention_on_ride_state() from public, anon, authenticated;

comment on function public.set_private_ride_location(uuid, uuid, text, text) is 'Server-only exact-location handoff. Rider ownership is revalidated and writes are accepted only after driver acceptance.';
comment on policy "private_locations_authorized_select" on public.ride_private_locations is 'Unexpired exact locations are visible only to the rider, accepted driver during an active ride, or dispatcher/admin during an active ride.';
