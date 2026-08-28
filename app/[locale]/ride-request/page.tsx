import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RideRequestForm } from './ride-request-form'

export const dynamic = 'force-dynamic'

const copy = {
  en: { title: 'Request a ride', subtitle: 'Share only what is needed to arrange your trip. Start with a general pickup area or trusted community hub.' },
  es: { title: 'Solicitar un viaje', subtitle: 'Comparte solo lo necesario para coordinar tu viaje. Comienza con un área general de recogida o un punto comunitario de confianza.' },
} as const

export default async function RideRequestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub) redirect(`/${lang}/login`)

  const [{ data: regions }, { data: hubs }] = await Promise.all([
    supabase
      .from('service_regions')
      .select('id,name_en,name_es')
      .eq('active', true)
      .order(lang === 'es' ? 'name_es' : 'name_en'),
    supabase
      .from('pickup_hubs')
      .select('id,service_region_id,name_en,name_es,address_text')
      .eq('active', true)
      .order(lang === 'es' ? 'name_es' : 'name_en'),
  ])

  return (
    <main className="shell narrow">
      <section className="panel">
        <p className="eyebrow">Juntos</p>
        <h1>{t.title}</h1>
        <p className="lead small">{t.subtitle}</p>
        <RideRequestForm locale={lang} regions={regions ?? []} hubs={hubs ?? []} />
      </section>
    </main>
  )
}
