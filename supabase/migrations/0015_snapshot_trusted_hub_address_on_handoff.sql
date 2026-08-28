grant select on public.pickup_hubs to service_role;

create or replace function public.set_private_ride_location(
  p_actor_id uuid,
  p_ride_request_id uuid,
  p_pickup_address text,
  p_destination_address text
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_ride public.ride_requests%rowtype;
  v_pickup text := nullif(btrim(p_pickup_address), '');
  v_destination text := nullif(btrim(p_destination_address), '');
  v_retained_until timestamptz;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;

  select * into v_ride
  from public.ride_requests
  where id = p_ride_request_id
  for update;

  if not found then raise exception 'ride not found'; end if;
  if v_ride.rider_id <> p_actor_id then raise exception 'ride owner required'; end if;
  if v_ride.status <> 'accepted' then raise exception 'private location can be submitted only after driver acceptance'; end if;

  if v_ride.pickup_hub_id is not null then
    select ph.address_text into v_pickup
    from public.pickup_hubs ph
    where ph.id = v_ride.pickup_hub_id;
    if v_pickup is null then raise exception 'trusted hub address unavailable'; end if;
  elsif v_pickup is null then
    raise exception 'private pickup address required when no trusted hub is selected';
  end if;

  if v_destination is null then raise exception 'destination address required'; end if;
  if char_length(v_pickup) > 240 then raise exception 'pickup address too long'; end if;
  if char_length(v_destination) > 240 then raise exception 'destination address too long'; end if;

  v_retained_until := greatest(v_ride.requested_at + interval '24 hours', now() + interval '24 hours');

  insert into public.ride_private_locations (
    ride_request_id, rider_id, pickup_address, destination_address, retained_until
  ) values (
    p_ride_request_id, p_actor_id, v_pickup, v_destination, v_retained_until
  )
  on conflict (ride_request_id) do update
    set pickup_address = excluded.pickup_address,
        destination_address = excluded.destination_address,
        retained_until = excluded.retained_until
    where public.ride_private_locations.rider_id = p_actor_id;
end;
$$;

revoke all on function public.set_private_ride_location(uuid, uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.set_private_ride_location(uuid, uuid, text, text) to service_role;

comment on function public.set_private_ride_location(uuid, uuid, text, text) is 'Server-only accepted-ride exact-location handoff. Trusted hub pickup addresses are snapshotted server-side; private pickup is required only when no hub was selected.';
