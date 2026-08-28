'use server'

import { revalidatePath } from 'next/cache'
import {
  assignRideAsCurrentUser,
  cancelRideAsCurrentUser,
  refreshCandidatesAsCurrentUser,
} from '@/lib/juntos/server-commands'

function localeFrom(formData: FormData) {
  return formData.get('locale') === 'es' ? 'es' : 'en'
}

export async function refreshCandidatesAction(formData: FormData) {
  const locale = localeFrom(formData)
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  await refreshCandidatesAsCurrentUser(rideRequestId)
  revalidatePath(`/${locale}/dispatch`)
}

export async function assignRideAction(formData: FormData) {
  const locale = localeFrom(formData)
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  const driverId = String(formData.get('driver_id') ?? '')
  await assignRideAsCurrentUser(rideRequestId, driverId)
  revalidatePath(`/${locale}/dispatch`)
  revalidatePath(`/${locale}/driver`)
}

export async function cancelRideAction(formData: FormData) {
  const locale = localeFrom(formData)
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  const reasonCode = String(formData.get('reason_code') ?? '') || 'dispatcher_cancelled'
  await cancelRideAsCurrentUser(rideRequestId, reasonCode)
  revalidatePath(`/${locale}/dispatch`)
  revalidatePath(`/${locale}/dashboard`)
  revalidatePath(`/${locale}/driver`)
}
