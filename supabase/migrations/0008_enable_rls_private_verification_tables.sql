-- Defense in depth for privileged verification data.
-- These tables remain in the non-exposed private schema and have no client RLS policies.

alter table private.driver_verification enable row level security;
alter table private.vehicle_verification enable row level security;
