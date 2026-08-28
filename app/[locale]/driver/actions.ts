'use server'

import { revalidatePath } from 'next/cache'
import {
  advanceRideAsCurrentUser,
  respondToOfferAsCurrentUser,
} from '@/lib/juntos/server-commands'
import type { Database } from '@/lib/database.types'

type RideStatus = Database['public']['Enums']['ride_status']

function localeFrom(formData: FormData) {
  return formData.get('locale') === 'es' ? 'es' : 'en'
}

function revalidateDriverViews(locale: 'en' | 'es') {
  revalidatePath(`/${locale}/driver`)
  revalidatePath(`/${locale}/dispatch`)
  revalidatePath(`/${locale}/dashboard`)
}

export async function respondToOfferAction(formData: FormData) {
  const locale = localeFrom(formData)
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  const accept = formData.get('decision') === 'accept'
  await respondToOfferAsCurrentUser(rideRequestId, accept)
  revalidateDriverViews(locale)
}

export async function advanceRideAction(formData: FormData) {
  const locale = localeFrom(formData)
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  const target = String(formData.get('target') ?? '') as RideStatus
  await advanceRideAsCurrentUser(rideRequestId, target)
  revalidateDriverViews(locale)
}
