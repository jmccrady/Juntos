-- Add covering indexes for common ownership/scheduling foreign-key paths and
-- collapse the two ride SELECT policies into one authorized-reader policy.

create index if not exists ride_requests_rider_requested_idx
  on public.ride_requests (rider_id, requested_at);

create index if not exists ride_private_locations_rider_idx
  on public.ride_private_locations (rider_id);

create index if not exists vehicles_driver_active_idx
  on public.vehicles (driver_id, active);

create index if not exists driver_availability_driver_schedule_idx
  on public.driver_availability (driver_id, starts_at, ends_at);

create index if not exists driver_verification_reviewed_by_idx
  on private.driver_verification (reviewed_by)
  where reviewed_by is not null;

create index if not exists vehicle_verification_reviewed_by_idx
  on private.vehicle_verification (reviewed_by)
  where reviewed_by is not null;

drop policy if exists "ride_requests_owner_select" on public.ride_requests;
drop policy if exists "ride_requests_dispatcher_select" on public.ride_requests;

create policy "ride_requests_authorized_select" on public.ride_requests
  for select to authenticated
  using (
    (select auth.uid()) = rider_id
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('dispatcher', 'admin')
    )
  );

comment on policy "ride_requests_authorized_select" on public.ride_requests is
  'Riders may read their own generalized requests; dispatchers/admins may read generalized queue metadata. Exact locations remain separately protected.';
