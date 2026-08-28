'use server'

import { revalidatePath } from 'next/cache'
import {
  cancelRideAsCurrentUser,
  savePrivateLocationAsCurrentUser,
} from '@/lib/juntos/server-commands'

function revalidateRideViews(locale: 'en' | 'es') {
  revalidatePath(`/${locale}/dashboard`)
  revalidatePath(`/${locale}/dispatch`)
  revalidatePath(`/${locale}/driver`)
}

export async function cancelOwnRideAction(formData: FormData) {
  const locale = formData.get('locale') === 'es' ? 'es' : 'en'
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  await cancelRideAsCurrentUser(rideRequestId, 'rider_cancelled')
  revalidateRideViews(locale)
}

export async function savePrivateLocationAction(formData: FormData) {
  const locale = formData.get('locale') === 'es' ? 'es' : 'en'
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  const pickupAddress = String(formData.get('pickup_address') ?? '')
  const destinationAddress = String(formData.get('destination_address') ?? '')

  await savePrivateLocationAsCurrentUser(rideRequestId, pickupAddress, destinationAddress)
  revalidateRideViews(locale)
}
