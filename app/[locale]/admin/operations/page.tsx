import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createHubAction,
  createRegionAction,
  setHubActiveAction,
  setRegionActiveAction,
} from './actions'

export const dynamic = 'force-dynamic'

const copy = {
  en: {
    title: 'Operations setup',
    body: 'Configure the service areas and trusted public pickup hubs used by deterministic matching. Do not enter private rider addresses here.',
    regions: 'Service regions',
    regionEn: 'Region name (English)',
    regionEs: 'Region name (Spanish)',
    slug: 'Short identifier (optional)',
    addRegion: 'Add service region',
    hubs: 'Trusted pickup hubs',
    hubEn: 'Hub name (English)',
    hubEs: 'Hub name (Spanish)',
    region: 'Service region',
    type: 'Hub type',
    address: 'Public hub address',
    instructionsEn: 'Pickup instructions (English)',
    instructionsEs: 'Pickup instructions (Spanish)',
    addHub: 'Add trusted hub',
    active: 'Active',
    inactive: 'Inactive',
    disable: 'Disable',
    enable: 'Enable',
    emptyRegions: 'No service regions configured yet.',
    emptyHubs: 'No trusted hubs configured yet.',
    dispatch: 'Dispatch',
  },
  es: {
    title: 'Configuración operativa',
    body: 'Configura las áreas de servicio y los puntos públicos de confianza usados por la asignación determinista. No ingreses direcciones privadas de pasajeros aquí.',
    regions: 'Regiones de servicio',
    regionEn: 'Nombre de región (inglés)',
    regionEs: 'Nombre de región (español)',
    slug: 'Identificador corto (opcional)',
    addRegion: 'Agregar región',
    hubs: 'Puntos de recogida de confianza',
    hubEn: 'Nombre del punto (inglés)',
    hubEs: 'Nombre del punto (español)',
    region: 'Región de servicio',
    type: 'Tipo de punto',
    address: 'Dirección pública del punto',
    instructionsEn: 'Instrucciones (inglés)',
    instructionsEs: 'Instrucciones (español)',
    addHub: 'Agregar punto de confianza',
    active: 'Activo',
    inactive: 'Inactivo',
    disable: 'Desactivar',
    enable: 'Activar',
    emptyRegions: 'Todavía no hay regiones configuradas.',
    emptyHubs: 'Todavía no hay puntos de confianza configurados.',
    dispatch: 'Coordinación',
  },
} as const

export default async function OperationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) redirect(`/${lang}/login`)

  const { data: roles, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', userId)
  if (roleError || !roles?.some(({ role }) => role === 'admin')) notFound()

  const [{ data: regions, error: regionError }, { data: hubs, error: hubError }] = await Promise.all([
    supabase.from('service_regions').select('id,slug,name_en,name_es,active').order('name_en'),
    supabase.from('pickup_hubs').select('id,service_region_id,name_en,name_es,hub_type,address_text,active').order('name_en'),
  ])

  const regionName = (id: string) => {
    const region = regions?.find((item) => item.id === id)
    if (!region) return '—'
    return lang === 'es' ? region.name_es : region.name_en
  }

  return (
    <main className="shell">
      <nav className="nav">
        <Link href={`/${lang}`} className="brand">Juntos</Link>
        <Link href={`/${lang}/dispatch`} className="language">{t.dispatch}</Link>
      </nav>

      <section className="admin-shell">
        <p className="eyebrow">Juntos Admin</p>
        <h1>{t.title}</h1>
        <p className="lead small">{t.body}</p>

        {regionError || hubError ? <div className="notice error">Unable to load operations configuration.</div> : null}

        <div className="admin-grid">
          <section className="panel">
            <h2>{t.regions}</h2>
            <form action={createRegionAction} className="form compact-form">
              <input type="hidden" name="locale" value={lang} />
              <label>{t.regionEn}<input name="name_en" maxLength={120} required /></label>
              <label>{t.regionEs}<input name="name_es" maxLength={120} required /></label>
              <label>{t.slug}<input name="slug" maxLength={80} /></label>
              <button className="button primary" type="submit">{t.addRegion}</button>
            </form>

            {!regions?.length ? <div className="notice">{t.emptyRegions}</div> : null}
            <div className="config-list">
              {regions?.map((region) => (
                <article className="config-card" key={region.id}>
                  <div><strong>{lang === 'es' ? region.name_es : region.name_en}</strong><span>{region.slug} · {region.active ? t.active : t.inactive}</span></div>
                  <form action={setRegionActiveAction}>
                    <input type="hidden" name="locale" value={lang} />
                    <input type="hidden" name="id" value={region.id} />
                    <input type="hidden" name="active" value={region.active ? 'false' : 'true'} />
                    <button className="nav-button" type="submit">{region.active ? t.disable : t.enable}</button>
                  </form>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>{t.hubs}</h2>
            {regions?.length ? (
              <form action={createHubAction} className="form compact-form">
                <input type="hidden" name="locale" value={lang} />
                <label>{t.region}<select name="service_region_id" required>{regions.filter((region) => region.active).map((region) => <option value={region.id} key={region.id}>{lang === 'es' ? region.name_es : region.name_en}</option>)}</select></label>
                <label>{t.hubEn}<input name="name_en" maxLength={160} required /></label>
                <label>{t.hubEs}<input name="name_es" maxLength={160} required /></label>
                <label>{t.type}<select name="hub_type" defaultValue="community"><option value="community">Community</option><option value="church">Church</option><option value="business">Business</option><option value="medical">Medical</option><option value="school">School</option><option value="other">Other</option></select></label>
                <label>{t.address}<input name="address_text" maxLength={240} required /></label>
                <label>{t.instructionsEn}<textarea name="instructions_en" maxLength={500} rows={3} /></label>
                <label>{t.instructionsEs}<textarea name="instructions_es" maxLength={500} rows={3} /></label>
                <button className="button primary" type="submit">{t.addHub}</button>
              </form>
            ) : <div className="notice">{t.emptyRegions}</div>}

            {!hubs?.length ? <div className="notice">{t.emptyHubs}</div> : null}
            <div className="config-list">
              {hubs?.map((hub) => (
                <article className="config-card" key={hub.id}>
                  <div>
                    <strong>{lang === 'es' ? hub.name_es : hub.name_en}</strong>
                    <span>{regionName(hub.service_region_id)} · {hub.address_text} · {hub.active ? t.active : t.inactive}</span>
                  </div>
                  <form action={setHubActiveAction}>
                    <input type="hidden" name="locale" value={lang} />
                    <input type="hidden" name="id" value={hub.id} />
                    <input type="hidden" name="active" value={hub.active ? 'false' : 'true'} />
                    <button className="nav-button" type="submit">{hub.active ? t.disable : t.enable}</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
