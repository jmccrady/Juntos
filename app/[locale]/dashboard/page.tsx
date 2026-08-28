import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    .select('id,pickup_area,destination_area,requested_at,status')
    .order('requested_at', { ascending: false })
    .limit(20)

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

        {error ? <div className="notice error">Unable to load rides.</div> : null}
        {!error && rides?.length === 0 ? <div className="notice">{t.empty}</div> : null}

        <div className="ride-list">
          {rides?.map((ride) => (
            <article className="ride-card" key={ride.id}>
              <div><strong>{t.pickup}</strong><span>{ride.pickup_area}</span></div>
              <div><strong>{t.destination}</strong><span>{ride.destination_area}</span></div>
              <div><strong>{t.when}</strong><span>{new Date(ride.requested_at).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</span></div>
              <div><strong>{t.status}</strong><span className="status-pill">{ride.status}</span></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
