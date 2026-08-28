import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { assignRideAction, cancelRideAction, refreshCandidatesAction } from './actions'

export const dynamic = 'force-dynamic'

const copy = {
  en: {
    title: 'Dispatch queue',
    body: 'Operational view of generalized ride requests and deterministic driver candidates. Exact private pickup and destination addresses are not shown here.',
    empty: 'No active ride requests are waiting in the queue.',
    newRide: 'Rider view',
    pickup: 'Pickup area',
    destination: 'Destination area',
    when: 'Requested time',
    riders: 'Riders',
    purpose: 'Purpose',
    refresh: 'Refresh candidates',
    candidates: 'Eligible driver candidates',
    noCandidates: 'No eligible verified drivers are currently available for this request.',
    manual: 'This request does not have a structured pickup service area yet. Keep it in manual dispatch until a region is selected.',
    languageMatch: 'Rider language match',
    seats: 'seats',
    offer: 'Offer ride',
    assigned: 'Current assignment',
    cancel: 'Cancel ride',
    yes: 'Yes',
    no: 'No',
  },
  es: {
    title: 'Cola de coordinación',
    body: 'Vista operativa de solicitudes generales y candidatos de conductor determinados por reglas. Las direcciones privadas exactas no aparecen aquí.',
    empty: 'No hay solicitudes activas esperando en la cola.',
    newRide: 'Vista de pasajero',
    pickup: 'Área de recogida',
    destination: 'Área de destino',
    when: 'Hora solicitada',
    riders: 'Pasajeros',
    purpose: 'Motivo',
    refresh: 'Actualizar candidatos',
    candidates: 'Conductores elegibles',
    noCandidates: 'No hay conductores verificados y disponibles para esta solicitud.',
    manual: 'Esta solicitud todavía no tiene un área de servicio estructurada. Mantén la coordinación manual hasta seleccionar una región.',
    languageMatch: 'Coincidencia de idioma',
    seats: 'asientos',
    offer: 'Ofrecer viaje',
    assigned: 'Asignación actual',
    cancel: 'Cancelar viaje',
    yes: 'Sí',
    no: 'No',
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
    .select('id,pickup_area,destination_area,pickup_region_id,requested_at,rider_count,purpose,status,created_at')
    .in('status', ['requested', 'matched', 'accepted', 'arrived', 'in_progress'])
    .order('requested_at', { ascending: true })
    .limit(50)

  const rideIds = rides?.map((ride) => ride.id) ?? []
  const candidateResult = rideIds.length
    ? await supabase
        .from('ride_candidates')
        .select('ride_request_id,driver_id,driver_display_name,vehicle_label,seat_capacity,languages,language_match,capacity_margin,score,match_rank,generated_at')
        .in('ride_request_id', rideIds)
        .order('match_rank', { ascending: true })
    : { data: [], error: null }

  const assignmentResult = rideIds.length
    ? await supabase
        .from('ride_assignments')
        .select('ride_request_id,driver_id,status,assigned_at,responded_at')
        .in('ride_request_id', rideIds)
    : { data: [], error: null }

  const candidates = candidateResult.data ?? []
  const assignments = assignmentResult.data ?? []

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

        {error || candidateResult.error || assignmentResult.error ? <div className="notice error">Unable to load the complete dispatch queue.</div> : null}
        {!error && rides?.length === 0 ? <div className="notice">{t.empty}</div> : null}

        <div className="dispatch-list">
          {rides?.map((ride) => {
            const rideCandidates = candidates.filter((candidate) => candidate.ride_request_id === ride.id)
            const assignment = assignments.find((item) => item.ride_request_id === ride.id)
            const assignedCandidate = assignment
              ? rideCandidates.find((candidate) => candidate.driver_id === assignment.driver_id)
              : null

            return (
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

                {ride.status === 'requested' ? (
                  <section className="dispatch-candidates">
                    {ride.pickup_region_id ? (
                      <>
                        <form action={refreshCandidatesAction} className="inline-form">
                          <input type="hidden" name="locale" value={lang} />
                          <input type="hidden" name="ride_request_id" value={ride.id} />
                          <button className="button secondary compact-button" type="submit">{t.refresh}</button>
                        </form>
                        <h3>{t.candidates}</h3>
                        {rideCandidates.length === 0 ? <div className="notice">{t.noCandidates}</div> : null}
                        <div className="candidate-list">
                          {rideCandidates.map((candidate) => (
                            <div className="candidate-card" key={candidate.driver_id}>
                              <div>
                                <strong>#{candidate.match_rank} · {candidate.driver_display_name}</strong>
                                <span>{candidate.vehicle_label}</span>
                                <span>{candidate.seat_capacity} {t.seats} · {candidate.languages.join(', ')}</span>
                                <span>{t.languageMatch}: {candidate.language_match ? t.yes : t.no} · score {candidate.score}</span>
                              </div>
                              <form action={assignRideAction}>
                                <input type="hidden" name="locale" value={lang} />
                                <input type="hidden" name="ride_request_id" value={ride.id} />
                                <input type="hidden" name="driver_id" value={candidate.driver_id} />
                                <button className="button primary compact-button" type="submit">{t.offer}</button>
                              </form>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="notice">{t.manual}</div>
                    )}
                  </section>
                ) : null}

                {assignment ? (
                  <div className="assignment-card">
                    <strong>{t.assigned}: {assignedCandidate?.driver_display_name ?? `Volunteer • ${assignment.driver_id.slice(0, 8)}`}</strong>
                    <span>{assignedCandidate?.vehicle_label ?? '—'} · {assignment.status}</span>
                  </div>
                ) : null}

                {ride.status !== 'in_progress' ? (
                  <form action={cancelRideAction} className="inline-form">
                    <input type="hidden" name="locale" value={lang} />
                    <input type="hidden" name="ride_request_id" value={ride.id} />
                    <input type="hidden" name="reason_code" value="dispatcher_cancelled" />
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
