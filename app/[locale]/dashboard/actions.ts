'use server'

import { revalidatePath } from 'next/cache'
import { cancelRideAsCurrentUser } from '@/lib/juntos/server-commands'

export async function cancelOwnRideAction(formData: FormData) {
  const locale = formData.get('locale') === 'es' ? 'es' : 'en'
  const rideRequestId = String(formData.get('ride_request_id') ?? '')
  await cancelRideAsCurrentUser(rideRequestId, 'rider_cancelled')
  revalidatePath(`/${locale}/dashboard`)
  revalidatePath(`/${locale}/dispatch`)
  revalidatePath(`/${locale}/driver`)
}
