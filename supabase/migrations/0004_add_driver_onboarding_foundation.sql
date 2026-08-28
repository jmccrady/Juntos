-- Volunteer-editable operational data stays in public under owner-only RLS.
-- Verification and approval state stays in the private schema so volunteers
-- cannot mark themselves or their vehicles verified.

create table public.driver_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  service_region text,
  languages text[] not null default array['en']::text[],
  is_accepting_rides boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_profiles_service_region_length check (service_region is null or char_length(service_region) <= 120),
  constraint driver_profiles_languages_count check (cardinality(languages) between 1 and 8)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete cascade,
  make text not null,
  model text not null,
  color text not null,
  model_year smallint,
  seat_capacity smallint not null check (seat_capacity between 1 and 12),
  wheelchair_accessible boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_make_length check (char_length(make) between 1 and 60),
  constraint vehicles_model_length check (char_length(model) between 1 and 60),
  constraint vehicles_color_length check (char_length(color) between 1 and 40),
  constraint vehicles_model_year_range check (model_year is null or model_year between 1980 and 2100)
);

create table public.driver_availability (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  service_region text,
  created_at timestamptz not null default now(),
  constraint driver_availability_window check (ends_at > starts_at),
  constraint driver_availability_service_region_length check (service_region is null or char_length(service_region) <= 120)
);

create table private.driver_verification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','in_review','verified','rejected','suspended')),
  license_status text not null default 'not_checked' check (license_status in ('not_checked','valid','invalid','expired')),
  insurance_status text not null default 'not_checked' check (insurance_status in ('not_checked','valid','invalid','expired')),
  background_status text not null default 'not_started' check (background_status in ('not_started','pending','clear','review','failed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table private.vehicle_verification (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_availability enable row level security;

revoke all on public.driver_profiles from anon;
revoke all on public.vehicles from anon;
revoke all on public.driver_availability from anon;
revoke all on private.driver_verification from public, anon, authenticated;
revoke all on private.vehicle_verification from public, anon, authenticated;

grant select, insert, update on public.driver_profiles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.driver_availability to authenticated;

create policy "driver_profiles_owner_select" on public.driver_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "driver_profiles_owner_insert" on public.driver_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "driver_profiles_owner_update" on public.driver_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "vehicles_owner_select" on public.vehicles for select to authenticated using ((select auth.uid()) = driver_id);
create policy "vehicles_owner_insert" on public.vehicles for insert to authenticated with check ((select auth.uid()) = driver_id);
create policy "vehicles_owner_update" on public.vehicles for update to authenticated using ((select auth.uid()) = driver_id) with check ((select auth.uid()) = driver_id);
create policy "vehicles_owner_delete" on public.vehicles for delete to authenticated using ((select auth.uid()) = driver_id);

create policy "driver_availability_owner_select" on public.driver_availability for select to authenticated using ((select auth.uid()) = driver_id);
create policy "driver_availability_owner_insert" on public.driver_availability for insert to authenticated with check ((select auth.uid()) = driver_id);
create policy "driver_availability_owner_update" on public.driver_availability for update to authenticated using ((select auth.uid()) = driver_id) with check ((select auth.uid()) = driver_id);
create policy "driver_availability_owner_delete" on public.driver_availability for delete to authenticated using ((select auth.uid()) = driver_id);

comment on table private.driver_verification is 'Privileged volunteer verification state. Never expose this table directly to browser clients.';
comment on table private.vehicle_verification is 'Privileged vehicle approval state. Never expose this table directly to browser clients.';
