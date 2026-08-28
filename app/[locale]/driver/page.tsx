import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityForm } from './availability-form'
import { advanceRideAction, respondToOfferAction } from './actions'

export const dynamic = 'force-dynamic'

const copy = {
  en: {
    title: 'Driver schedule',
    body: 'Add times when you may be able to help. Availability does not make a volunteer match-eligible until Juntos verification is complete.',
    profile: 'Volunteer profile',
    region: 'Service area',
    languages: 'Languages',
    vehicle: 'Vehicle',
    seats: 'passenger seats',
    accepting: 'Accepting ride offers',
    yes: 'Yes',
    no: 'No',
    availability: 'Upcoming availability',
    empty: 'No upcoming availability windows yet.',
    edit: 'Edit volunteer profile',
    home: 'Home',
    rides: 'Ride offers and active rides',
    noRides: 'No current ride offers or active rides.',
    pickup: 'Pickup area',
    destination: 'Destination area',
    when: 'Requested time',
    riders: 'Riders',
    purpose: 'Purpose',
    accept: 'Accept ride',
    decline: 'Decline',
    arrived: 'I arrived',
    start: 'Start ride',
    complete: 'Complete ride',
    privacy: 'Only generalized trip details are shown here. Exact private pickup details are handled separately when an assigned ride requires them.',
  },
  es: {
    title: 'Horario del conductor',
    body: 'Agrega horarios en los que podrías ayudar. La disponibilidad no te hace elegible para viajes hasta completar la verificación de Juntos.',
    profile: 'Perfil de voluntario',
    region: 'Área de servicio',
    languages: 'Idiomas',
    vehicle: 'Vehículo',
    seats: 'asientos para pasajeros',
    accepting: 'Aceptando ofertas de viaje',
    yes: 'Sí',
    no: 'No',
    availability: 'Próxima disponibilidad',
    empty: 'Todavía no hay horarios de disponibilidad.',
    edit: 'Editar perfil de voluntario',
    home: 'Inicio',
    rides: 'Ofertas y viajes activos',
    noRides: 'No hay ofertas ni viajes activos.',
    pickup: 'Área de recogida',
    destination: 'Área de destino',
    when: 'Hora solicitada',
    riders: 'Pasajeros',
    purpose: 'Motivo',
    accept: 'Aceptar viaje',
    decline: 'Rechazar',
    arrived: 'Ya llegué',
    start: 'Iniciar viaje',
    complete: 'Completar viaje',
    privacy: 'Aquí solo aparecen detalles generales del viaje. Los datos privados exactos de recogida se manejan por separado cuando un viaje asignado los requiere.',
  },
} as const

export default async function DriverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) redirect(`/${lang}/login`)

  const { data: profile, error: profileError } = await supabase
    .from('driver_profiles')
    .select('service_region,service_region_id,languages,is_accepting_rides')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError || !profile) redirect(`/${lang}/volunteer`)

  const [{ data: vehicle }, { data: availability, error: availabilityError }, { data: regions }, { data: assignments, error: assignmentError }] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id,make,model,color,model_year,seat_capacity,wheelchair_accessible')
      .eq('driver_id', userId)
      .eq('active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('driver_availability')
      .select('id,starts_at,ends_at,service_region,service_region_id')
      .eq('driver_id', userId)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(20),
    supabase
      .from('service_regions')
      .select('id,name_en,name_es')
      .eq('active', true)
      .order(lang === 'es' ? 'name_es' : 'name_en'),
    supabase
      .from('ride_assignments')
      .select('ride_request_id,status,assigned_at')
      .eq('driver_id', userId)
      .in('status', ['offered', 'accepted'])
      .order('assigned_at', { ascending: true }),
  ])

  const assignedRideIds = assignments?.map((assignment) => assignment.ride_request_id) ?? []
  const rideResult = assignedRideIds.length
    ? await supabase
        .from('ride_requests')
        .select('id,pickup_area,destination_area,requested_at,rider_count,purpose,status')
        .in('id', assignedRideIds)
        .order('requested_at', { ascending: true })
    : { data: [], error: null }

  const rides = rideResult.data ?? []
  const activeRegions = regions ?? []
  const regionName = (regionId: string | null, fallback: string | null) => {
    const region = activeRegions.find((candidate) => candidate.id === regionId)
    if (!region) return fallback ?? '—'
    return lang === 'es' ? region.name_es : region.name_en
  }

  const lifecycleTarget = (status: string) => {
    if (status === 'accepted') return { target: 'arrived', label: t.arrived }
    if (status === 'arrived') return { target: 'in_progress', label: t.start }
    if (status === 'in_progress') return { target: 'completed', label: t.complete }
    return null
  }

  return (
    <main className="shell">
      <nav className="nav">
        <Link href={`/${lang}`} className="brand">Juntos</Link>
        <div className="nav-actions">
          <Link href={`/${lang}`} className="language">{t.home}</Link>
          <Link href={`/${lang}/volunteer`} className="language">{t.edit}</Link>
        </div>
      </nav>

      <section className="driver-shell">
        <p className="eyebrow">Juntos Volunteer</p>
        <h1>{t.title}</h1>
        <p className="lead small">{t.body}</p>

        <section className="ride-offers-section">
          <div className="dashboard-heading"><h2>{t.rides}</h2></div>
          <div className="privacy-note">🔒 {t.privacy}</div>
          {assignmentError || rideResult.error ? <div className="notice error">Unable to load current ride offers.</div> : null}
          {!assignmentError && !rideResult.error && assignments?.length === 0 ? <div className="notice">{t.noRides}</div> : null}
          <div className="driver-ride-list">
            {assignments?.map((assignment) => {
              const ride = rides.find((item) => item.id === assignment.ride_request_id)
              if (!ride) return null
              const next = lifecycleTarget(ride.status)

              return (
                <article className="driver-ride-card" key={assignment.ride_request_id}>
                  <div className="dispatch-main">
                    <div><span className="dispatch-label">{t.pickup}</span><strong>{ride.pickup_area}</strong></div>
                    <div><span className="dispatch-label">{t.destination}</span><strong>{ride.destination_area}</strong></div>
                  </div>
                  <div className="dispatch-meta">
                    <span><b>{t.when}:</b> {new Date(ride.requested_at).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</span>
                    <span><b>{t.riders}:</b> {ride.rider_count}</span>
                    <span><b>{t.purpose}:</b> {ride.purpose ?? '—'}</span>
                    <span className="status-pill">{ride.status}</span>
                  </div>

                  {assignment.status === 'offered' ? (
                    <div className="action-row">
                      <form action={respondToOfferAction}>
                        <input type="hidden" name="locale" value={lang} />
                        <input type="hidden" name="ride_request_id" value={ride.id} />
                        <input type="hidden" name="decision" value="accept" />
                        <button className="button primary compact-button" type="submit">{t.accept}</button>
                      </form>
                      <form action={respondToOfferAction}>
                        <input type="hidden" name="locale" value={lang} />
                        <input type="hidden" name="ride_request_id" value={ride.id} />
                        <input type="hidden" name="decision" value="decline" />
                        <button className="button secondary compact-button" type="submit">{t.decline}</button>
                      </form>
                    </div>
                  ) : null}

                  {assignment.status === 'accepted' && next ? (
                    <form action={advanceRideAction} className="inline-form">
                      <input type="hidden" name="locale" value={lang} />
                      <input type="hidden" name="ride_request_id" value={ride.id} />
                      <input type="hidden" name="target" value={next.target} />
                      <button className="button primary compact-button" type="submit">{next.label}</button>
                    </form>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>

        <div className="driver-grid">
          <section className="panel driver-summary">
            <h2>{t.profile}</h2>
            <dl className="detail-list">
              <div><dt>{t.region}</dt><dd>{regionName(profile.service_region_id, profile.service_region)}</dd></div>
              <div><dt>{t.languages}</dt><dd>{profile.languages.join(', ')}</dd></div>
              <div><dt>{t.accepting}</dt><dd>{profile.is_accepting_rides ? t.yes : t.no}</dd></div>
              <div>
                <dt>{t.vehicle}</dt>
                <dd>{vehicle ? `${vehicle.model_year ?? ''} ${vehicle.color} ${vehicle.make} ${vehicle.model} · ${vehicle.seat_capacity} ${t.seats}`.trim() : '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel driver-availability-panel">
            <h2>{t.availability}</h2>
            <AvailabilityForm
              locale={lang}
              defaultRegion={profile.service_region ?? ''}
              defaultRegionId={profile.service_region_id}
              regions={activeRegions}
            />
          </section>
        </div>

        <section className="availability-list-section">
          {availabilityError ? <div className="notice error">Unable to load availability.</div> : null}
          {!availabilityError && availability?.length === 0 ? <div className="notice">{t.empty}</div> : null}
          <div className="availability-list">
            {availability?.map((window) => (
              <article className="availability-card" key={window.id}>
                <strong>{new Date(window.starts_at).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</strong>
                <span>→</span>
                <strong>{new Date(window.ends_at).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</strong>
                <span>{regionName(window.service_region_id, window.service_region ?? profile.service_region)}</span>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
