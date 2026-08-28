import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cancelOwnRideAction, savePrivateLocationAction } from './actions'

export const dynamic = 'force-dynamic'

const copy = {
  en: {
    title: 'My rides',
    intro: 'Your ride requests appear here. Only you and authorized Juntos operations can access your trip details.',
    newRide: 'Request a ride',
    empty: 'You do not have any ride requests yet.',
    pickup: 'Pickup',
    destination: 'Destination',
    when: 'When',
    status: 'Status',
    cancel: 'Cancel ride',
    exactTitle: 'Exact trip details',
    exactBody: 'Your driver has accepted. Share the exact locations needed to complete this ride. These details are stored separately from the normal ride request.',
    exactPickup: 'Exact pickup address',
    exactDestination: 'Exact destination address',
    hubPickup: 'Your trusted hub pickup address will be attached automatically. Do not enter a private pickup address.',
    saveExact: 'Share exact trip details',
    updateExact: 'Replace exact trip details',
    exactSaved: 'Exact trip details are on file for this active ride.',
    retention: 'Juntos removes access when the ride is cancelled, removes driver access at completion, and shortens retained location data to two hours after completion.',
  },
  es: {
    title: 'Mis viajes',
    intro: 'Tus solicitudes de viaje aparecen aquí. Solo tú y el personal autorizado de Juntos pueden acceder a los detalles de tu viaje.',
    newRide: 'Solicitar un viaje',
    empty: 'Todavía no tienes solicitudes de viaje.',
    pickup: 'Recogida',
    destination: 'Destino',
    when: 'Cuándo',
    status: 'Estado',
    cancel: 'Cancelar viaje',
    exactTitle: 'Detalles exactos del viaje',
    exactBody: 'Tu conductor aceptó. Comparte solo las ubicaciones exactas necesarias para completar este viaje. Estos datos se guardan separados de la solicitud normal.',
    exactPickup: 'Dirección exacta de recogida',
    exactDestination: 'Dirección exacta de destino',
    hubPickup: 'La dirección de tu punto de confianza se adjuntará automáticamente. No ingreses una dirección privada de recogida.',
    saveExact: 'Compartir detalles exactos',
    updateExact: 'Reemplazar detalles exactos',
    exactSaved: 'Los detalles exactos están guardados para este viaje activo.',
    retention: 'Juntos elimina el acceso si se cancela el viaje, retira el acceso del conductor al completarse y reduce la retención de ubicación a dos horas después de completar el viaje.',
  },
} as const

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]
  const supabase = await createClient()

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) redirect(`/${lang}/login`)

  const { data: rides, error } = await supabase
    .from('ride_requests')
    .select('id,pickup_area,destination_area,pickup_hub_id,requested_at,status')
    .order('requested_at', { ascending: false })
    .limit(20)

  const rideIds = rides?.map((ride) => ride.id) ?? []
  const privateLocationResult = rideIds.length
    ? await supabase
        .from('ride_private_locations')
        .select('ride_request_id,retained_until')
        .in('ride_request_id', rideIds)
    : { data: [], error: null }
  const privateLocations = privateLocationResult.data ?? []

  return (
    <main className="shell narrow">
      <section className="panel">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Juntos</p>
            <h1>{t.title}</h1>
          </div>
          <Link className="button primary" href={`/${lang}/ride-request`}>{t.newRide}</Link>
        </div>
        <p className="lead small">{t.intro}</p>

        {error || privateLocationResult.error ? <div className="notice error">Unable to load rides.</div> : null}
        {!error && rides?.length === 0 ? <div className="notice">{t.empty}</div> : null}

        <div className="ride-list">
          {rides?.map((ride) => {
            const hasPrivateLocation = privateLocations.some((item) => item.ride_request_id === ride.id)

            return (
              <article className="ride-card" key={ride.id}>
                <div><strong>{t.pickup}</strong><span>{ride.pickup_area}</span></div>
                <div><strong>{t.destination}</strong><span>{ride.destination_area}</span></div>
                <div><strong>{t.when}</strong><span>{new Date(ride.requested_at).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</span></div>
                <div><strong>{t.status}</strong><span className="status-pill">{ride.status}</span></div>

                {ride.status === 'accepted' ? (
                  <section className="private-location-panel">
                    <h3>{t.exactTitle}</h3>
                    <p>{t.exactBody}</p>
                    {hasPrivateLocation ? <div className="notice success">{t.exactSaved}</div> : null}
                    <form action={savePrivateLocationAction} className="form compact-form">
                      <input type="hidden" name="locale" value={lang} />
                      <input type="hidden" name="ride_request_id" value={ride.id} />
                      {ride.pickup_hub_id ? (
                        <>
                          <input type="hidden" name="pickup_address" value="" />
                          <div className="privacy-note">{t.hubPickup}</div>
                        </>
                      ) : (
                        <label>{t.exactPickup}<input name="pickup_address" maxLength={240} autoComplete="street-address" required /></label>
                      )}
                      <label>{t.exactDestination}<input name="destination_address" maxLength={240} required /></label>
                      <div className="privacy-note">🔒 {t.retention}</div>
                      <button className="button primary" type="submit">{hasPrivateLocation ? t.updateExact : t.saveExact}</button>
                    </form>
                  </section>
                ) : null}

                {['requested', 'matched', 'accepted'].includes(ride.status) ? (
                  <form action={cancelOwnRideAction} className="inline-form">
                    <input type="hidden" name="locale" value={lang} />
                    <input type="hidden" name="ride_request_id" value={ride.id} />
                    <button className="nav-button danger-action" type="submit">{t.cancel}</button>
                  </form>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
