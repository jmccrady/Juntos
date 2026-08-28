-- When a volunteer creates an operational driver profile or vehicle, create
-- the corresponding privileged verification record automatically. Browser
-- users never receive access to these private tables.

create or replace function private.initialize_driver_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.driver_verification (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.initialize_driver_verification() from public, anon, authenticated;

drop trigger if exists on_driver_profile_created_verification on public.driver_profiles;
create trigger on_driver_profile_created_verification
after insert on public.driver_profiles
for each row execute function private.initialize_driver_verification();

create or replace function private.initialize_vehicle_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.vehicle_verification (vehicle_id)
  values (new.id)
  on conflict (vehicle_id) do nothing;
  return new;
end;
$$;

revoke all on function private.initialize_vehicle_verification() from public, anon, authenticated;

drop trigger if exists on_vehicle_created_verification on public.vehicles;
create trigger on_vehicle_created_verification
after insert on public.vehicles
for each row execute function private.initialize_vehicle_verification();
