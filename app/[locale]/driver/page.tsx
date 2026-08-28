import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityForm } from './availability-form'

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
    availability: 'Upcoming availability',
    empty: 'No upcoming availability windows yet.',
    edit: 'Edit volunteer profile',
    home: 'Home',
  },
  es: {
    title: 'Horario del conductor',
    body: 'Agrega horarios en los que podrías ayudar. La disponibilidad no te hace elegible para viajes hasta completar la verificación de Juntos.',
    profile: 'Perfil de voluntario',
    region: 'Área de servicio',
    languages: 'Idiomas',
    vehicle: 'Vehículo',
    seats: 'asientos para pasajeros',
    availability: 'Próxima disponibilidad',
    empty: 'Todavía no hay horarios de disponibilidad.',
    edit: 'Editar perfil de voluntario',
    home: 'Inicio',
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

  const [{ data: vehicle }, { data: availability, error: availabilityError }, { data: regions }] = await Promise.all([
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
  ])

  const activeRegions = regions ?? []
  const regionName = (regionId: string | null, fallback: string | null) => {
    const region = activeRegions.find((candidate) => candidate.id === regionId)
    if (!region) return fallback ?? '—'
    return lang === 'es' ? region.name_es : region.name_en
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

        <div className="driver-grid">
          <section className="panel driver-summary">
            <h2>{t.profile}</h2>
            <dl className="detail-list">
              <div><dt>{t.region}</dt><dd>{regionName(profile.service_region_id, profile.service_region)}</dd></div>
              <div><dt>{t.languages}</dt><dd>{profile.languages.join(', ')}</dd></div>
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
