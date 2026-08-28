create index ride_assignments_assigned_by_idx on public.ride_assignments (assigned_by);
create index ride_assignments_vehicle_idx on public.ride_assignments (vehicle_id);
create index ride_candidates_availability_idx on public.ride_candidates (availability_id);
create index ride_candidates_vehicle_idx on public.ride_candidates (vehicle_id);
create index ride_events_actor_idx on public.ride_events (actor_id) where actor_id is not null;
