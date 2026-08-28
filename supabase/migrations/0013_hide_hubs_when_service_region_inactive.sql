drop policy if exists "pickup_hubs_authorized_select" on public.pickup_hubs;

create policy "pickup_hubs_authorized_select" on public.pickup_hubs
  for select to authenticated
  using (
    (
      active
      and exists (
        select 1
        from public.service_regions sr
        where sr.id = service_region_id and sr.active
      )
    )
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = 'admin'
    )
  );

comment on policy "pickup_hubs_authorized_select" on public.pickup_hubs is 'Authenticated users see only active hubs whose parent service region is active. Admins may see inactive configuration for management.';
