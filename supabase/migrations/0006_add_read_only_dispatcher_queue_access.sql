-- Users may see their own assigned application roles, but role writes remain
-- privileged. Dispatchers/admins may read generalized ride request metadata.
-- Exact private trip locations remain isolated in ride_private_locations.

grant select on public.user_roles to authenticated;

create policy "user_roles_self_select" on public.user_roles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ride_requests_dispatcher_select" on public.ride_requests
  for select to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('dispatcher', 'admin')
    )
  );

comment on policy "ride_requests_dispatcher_select" on public.ride_requests is
  'Dispatchers may read generalized ride request metadata. Exact locations remain protected in ride_private_locations.';
