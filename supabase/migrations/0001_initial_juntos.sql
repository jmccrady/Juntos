-- Juntos initial privacy-first schema

create extension if not exists pgcrypto;

create type public.app_role as enum ('rider', 'driver', 'dispatcher', 'admin');
create type public.ride_status as enum ('requested', 'matched', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references auth.users(id) on delete cascade,
  pickup_area text not null,
  destination_area text not null,
  requested_at timestamptz not null,
  rider_count smallint not null default 1 check (rider_count between 1 and 8),
  purpose text,
  needs text,
  status public.ride_status not null default 'requested',
  created_at timestamptz not null default now()
);

-- Exact locations are isolated from ordinary ride metadata.
create table public.ride_private_locations (
  ride_request_id uuid primary key references public.ride_requests(id) on delete cascade,
  rider_id uuid not null references auth.users(id) on delete cascade,
  pickup_address text,
  destination_address text,
  retained_until timestamptz not null default (now() + interval '7 days')
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.ride_requests enable row level security;
alter table public.ride_private_locations enable row level security;

revoke all on public.user_roles from anon, authenticated;
revoke all on public.ride_private_locations from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.ride_requests to authenticated;
grant select, insert, update on public.ride_private_locations to authenticated;

create policy "profiles_self_select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_self_update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "ride_requests_owner_select" on public.ride_requests for select to authenticated using ((select auth.uid()) = rider_id);
create policy "ride_requests_owner_insert" on public.ride_requests for insert to authenticated with check ((select auth.uid()) = rider_id);
create policy "ride_requests_owner_update" on public.ride_requests for update to authenticated using ((select auth.uid()) = rider_id) with check ((select auth.uid()) = rider_id);

create policy "private_locations_owner_select" on public.ride_private_locations for select to authenticated using ((select auth.uid()) = rider_id);
create policy "private_locations_owner_insert" on public.ride_private_locations for insert to authenticated with check ((select auth.uid()) = rider_id);
create policy "private_locations_owner_update" on public.ride_private_locations for update to authenticated using ((select auth.uid()) = rider_id) with check ((select auth.uid()) = rider_id);

comment on table public.ride_private_locations is 'Sensitive exact trip locations. Access must expand only through explicit assigned-driver/dispatcher policies in later migrations.';
