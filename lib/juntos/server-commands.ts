import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/database.types'

type RideStatus = Database['public']['Enums']['ride_status']

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ADVANCE_TARGETS: RideStatus[] = ['arrived', 'in_progress', 'completed']
const REASON_CODE_PATTERN = /^[a-z0-9_-]{1,40}$/

function assertUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) throw new Error(`Invalid ${label}`)
}

async function currentActor() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const actorId = data?.claims?.sub

  if (error || !actorId) throw new Error('Authentication required')
  assertUuid(actorId, 'actor')

  return { actorId, supabase }
}

async function requireDispatcher() {
  const { actorId, supabase } = await currentActor()
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', actorId)

  if (error || !roles?.some(({ role }) => role === 'dispatcher' || role === 'admin')) {
    throw new Error('Dispatcher role required')
  }

  return actorId
}

export async function refreshCandidatesAsCurrentUser(rideRequestId: string) {
  assertUuid(rideRequestId, 'ride request')
  const actorId = await requireDispatcher()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('refresh_ride_candidates', {
    p_actor_id: actorId,
    p_ride_request_id: rideRequestId,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function assignRideAsCurrentUser(rideRequestId: string, driverId: string) {
  assertUuid(rideRequestId, 'ride request')
  assertUuid(driverId, 'driver')
  const actorId = await requireDispatcher()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('assign_ride', {
    p_actor_id: actorId,
    p_ride_request_id: rideRequestId,
    p_driver_id: driverId,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function respondToOfferAsCurrentUser(rideRequestId: string, accept: boolean) {
  assertUuid(rideRequestId, 'ride request')
  const { actorId } = await currentActor()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('respond_to_ride_offer', {
    p_actor_id: actorId,
    p_ride_request_id: rideRequestId,
    p_accept: accept,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function advanceRideAsCurrentUser(rideRequestId: string, target: RideStatus) {
  assertUuid(rideRequestId, 'ride request')
  if (!ADVANCE_TARGETS.includes(target)) throw new Error('Invalid ride transition')
  const { actorId } = await currentActor()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('advance_ride', {
    p_actor_id: actorId,
    p_ride_request_id: rideRequestId,
    p_target: target,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function cancelRideAsCurrentUser(rideRequestId: string, reasonCode?: string | null) {
  assertUuid(rideRequestId, 'ride request')
  const normalizedReason = reasonCode?.trim() || null
  if (normalizedReason && !REASON_CODE_PATTERN.test(normalizedReason)) throw new Error('Invalid cancellation reason')

  const { actorId } = await currentActor()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('cancel_ride', {
    p_actor_id: actorId,
    p_ride_request_id: rideRequestId,
    p_reason_code: normalizedReason ?? undefined,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function savePrivateLocationAsCurrentUser(
  rideRequestId: string,
  pickupAddress: string,
  destinationAddress: string,
) {
  assertUuid(rideRequestId, 'ride request')
  const pickup = pickupAddress.trim()
  const destination = destinationAddress.trim()
  if (pickup.length > 240 || destination.length < 1 || destination.length > 240) {
    throw new Error('Invalid private location')
  }

  const { actorId } = await currentActor()
  const admin = createAdminClient()
  const { error } = await admin.rpc('set_private_ride_location', {
    p_actor_id: actorId,
    p_ride_request_id: rideRequestId,
    p_pickup_address: pickup,
    p_destination_address: destination,
  })

  if (error) throw new Error(error.message)
}
