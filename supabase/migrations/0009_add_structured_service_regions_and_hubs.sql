create table public.service_regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_es text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_regions_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint service_regions_name_en_length check (char_length(name_en) between 1 and 120),
  constraint service_regions_name_es_length check (char_length(name_es) between 1 and 120)
);

create table public.pickup_hubs (
  id uuid primary key default gen_random_uuid(),
  service_region_id uuid not null references public.service_regions(id) on delete restrict,
  name_en text not null,
  name_es text not null,
  hub_type text not null default 'community' check (hub_type in ('community','church','business','medical','school','other')),
  address_text text not null,
  instructions_en text,
  instructions_es text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_hubs_name_en_length check (char_length(name_en) between 1 and 160),
  constraint pickup_hubs_name_es_length check (char_length(name_es) between 1 and 160),
  constraint pickup_hubs_address_length check (char_length(address_text) between 1 and 240),
  constraint pickup_hubs_instructions_en_length check (instructions_en is null or char_length(instructions_en) <= 500),
  constraint pickup_hubs_instructions_es_length check (instructions_es is null or char_length(instructions_es) <= 500)
);

alter table public.driver_profiles
  add column service_region_id uuid references public.service_regions(id) on delete set null;

alter table public.driver_availability
  add column service_region_id uuid references public.service_regions(id) on delete set null;

alter table public.ride_requests
  add column pickup_region_id uuid references public.service_regions(id) on delete set null,
  add column destination_region_id uuid references public.service_regions(id) on delete set null,
  add column pickup_hub_id uuid references public.pickup_hubs(id) on delete set null;

create index service_regions_active_idx on public.service_regions (active, name_en);
create index pickup_hubs_region_active_idx on public.pickup_hubs (service_region_id, active, name_en);
create index driver_profiles_service_region_id_idx on public.driver_profiles (service_region_id) where service_region_id is not null;
create index driver_availability_service_region_id_idx on public.driver_availability (service_region_id, starts_at, ends_at) where service_region_id is not null;
create index ride_requests_pickup_region_idx on public.ride_requests (pickup_region_id, requested_at) where pickup_region_id is not null;
create index ride_requests_destination_region_idx on public.ride_requests (destination_region_id, requested_at) where destination_region_id is not null;
create index ride_requests_pickup_hub_idx on public.ride_requests (pickup_hub_id, requested_at) where pickup_hub_id is not null;

alter table public.service_regions enable row level security;
alter table public.pickup_hubs enable row level security;

revoke all on public.service_regions from anon;
revoke all on public.pickup_hubs from anon;
grant select, insert, update, delete on public.service_regions to authenticated;
grant select, insert, update, delete on public.pickup_hubs to authenticated;

create policy "service_regions_authorized_select" on public.service_regions
  for select to authenticated
  using (
    active
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

create policy "service_regions_admin_insert" on public.service_regions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

create policy "service_regions_admin_update" on public.service_regions
  for update to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

create policy "service_regions_admin_delete" on public.service_regions
  for delete to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

create policy "pickup_hubs_authorized_select" on public.pickup_hubs
  for select to authenticated
  using (
    active
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

create policy "pickup_hubs_admin_insert" on public.pickup_hubs
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

create policy "pickup_hubs_admin_update" on public.pickup_hubs
  for update to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

create policy "pickup_hubs_admin_delete" on public.pickup_hubs
  for delete to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

drop policy if exists "ride_requests_owner_insert" on public.ride_requests;
create policy "ride_requests_owner_insert" on public.ride_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = rider_id
    and (
      pickup_region_id is null
      or exists (select 1 from public.service_regions sr where sr.id = pickup_region_id and sr.active)
    )
    and (
      destination_region_id is null
      or exists (select 1 from public.service_regions sr where sr.id = destination_region_id and sr.active)
    )
    and (
      pickup_hub_id is null
      or exists (
        select 1
        from public.pickup_hubs ph
        where ph.id = pickup_hub_id
          and ph.active
          and (pickup_region_id is null or ph.service_region_id = pickup_region_id)
      )
    )
  );

revoke update on public.ride_requests from authenticated;
drop policy if exists "ride_requests_owner_update" on public.ride_requests;

drop policy if exists "driver_profiles_owner_insert" on public.driver_profiles;
drop policy if exists "driver_profiles_owner_update" on public.driver_profiles;
create policy "driver_profiles_owner_insert" on public.driver_profiles
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      service_region_id is null
      or exists (select 1 from public.service_regions sr where sr.id = service_region_id and sr.active)
    )
  );
create policy "driver_profiles_owner_update" on public.driver_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      service_region_id is null
      or exists (select 1 from public.service_regions sr where sr.id = service_region_id and sr.active)
    )
  );

drop policy if exists "driver_availability_owner_insert" on public.driver_availability;
drop policy if exists "driver_availability_owner_update" on public.driver_availability;
create policy "driver_availability_owner_insert" on public.driver_availability
  for insert to authenticated
  with check (
    (select auth.uid()) = driver_id
    and (
      service_region_id is null
      or exists (select 1 from public.service_regions sr where sr.id = service_region_id and sr.active)
    )
  );
create policy "driver_availability_owner_update" on public.driver_availability
  for update to authenticated
  using ((select auth.uid()) = driver_id)
  with check (
    (select auth.uid()) = driver_id
    and (
      service_region_id is null
      or exists (select 1 from public.service_regions sr where sr.id = service_region_id and sr.active)
    )
  );

comment on table public.service_regions is 'Structured service areas used for driver qualification and ride matching. Geographic definitions are operational configuration, not rider location history.';
comment on table public.pickup_hubs is 'Trusted public/community pickup locations. Hub addresses are operational public-place data, not private rider addresses.';
comment on column public.driver_profiles.service_region is 'Legacy/freeform service area retained temporarily for compatibility. Prefer service_region_id for matching.';
comment on column public.driver_availability.service_region is 'Legacy/freeform service area retained temporarily for compatibility. Prefer service_region_id for matching.';
