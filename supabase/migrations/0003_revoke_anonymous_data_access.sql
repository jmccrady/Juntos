-- Defense in depth: anonymous users should not receive table privileges
-- for rider profiles or ride workflow data. Authenticated access remains
-- constrained by RLS ownership policies.

revoke all on public.profiles from anon;
revoke all on public.ride_requests from anon;
revoke all on public.ride_private_locations from anon;
revoke all on public.user_roles from anon;
