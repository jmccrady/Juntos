import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const copy = {
  en: {
    title: 'Dispatch queue',
    body: 'Read-only triage view of generalized ride requests. Exact private pickup and destination addresses are not shown here.',
    empty: 'No ride requests are waiting in the queue.',
    newRide: 'Rider view',
    pickup: 'Pickup area',
    destination: 'Destination area',
    when: 'Requested time',
    riders: 'Riders',
    purpose: 'Purpose',
    status: 'Status',
  },
  es: {
    title: 'Cola de coordinación',
    body: 'Vista de triaje de solo lectura con solicitudes generales. Las direcciones privadas exactas de recogida y destino no aparecen aquí.',
    empty: 'No hay solicitudes esperando en la cola.',
    newRide: 'Vista de pasajero',
    pickup: 'Área de recogida',
    destination: 'Área de destino',
    when: 'Hora solicitada',
    riders: 'Pasajeros',
    purpose: 'Motivo',
    status: 'Estado',
  },
} as const

export default async function DispatchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) redirect(`/${lang}/login`)

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (roleError) notFound()

  const canDispatch = roles?.some(({ role }) => role === 'dispatcher' || role === 'admin') ?? false
  if (!canDispatch) notFound()

  const { data: rides, error } = await supabase
    .from('ride_requests')
    .select('id,pickup_area,destination_area,requested_at,rider_count,purpose,status,created_at')
    .in('status', ['requested', 'matched', 'accepted'])
    .order('requested_at', { ascending: true })
    .limit(50)

  return (
    <main className="shell">
      <nav className="nav">
        <Link href={`/${lang}`} className="brand">Juntos</Link>
        <Link href={`/${lang}/dashboard`} className="language">{t.newRide}</Link>
      </nav>

      <section className="dispatch-shell">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Juntos Dispatch</p>
            <h1>{t.title}</h1>
          </div>
        </div>
        <p className="lead small">{t.body}</p>

        {error ? <div className="notice error">Unable to load the dispatch queue.</div> : null}
        {!error && rides?.length === 0 ? <div className="notice">{t.empty}</div> : null}

        <div className="dispatch-list">
          {rides?.map((ride) => (
            <article className="dispatch-card" key={ride.id}>
              <div className="dispatch-main">
                <div>
                  <span className="dispatch-label">{t.pickup}</span>
                  <strong>{ride.pickup_area}</strong>
                </div>
                <div>
                  <span className="dispatch-label">{t.destination}</span>
                  <strong>{ride.destination_area}</strong>
                </div>
              </div>
              <div className="dispatch-meta">
                <span><b>{t.when}:</b> {new Date(ride.requested_at).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</span>
                <span><b>{t.riders}:</b> {ride.rider_count}</span>
                <span><b>{t.purpose}:</b> {ride.purpose ?? '—'}</span>
                <span className="status-pill">{ride.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
