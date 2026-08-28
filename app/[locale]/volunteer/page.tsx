import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VolunteerForm } from './volunteer-form'

export const dynamic = 'force-dynamic'

const copy = {
  en: {
    title: 'Volunteer to drive',
    body: 'Tell Juntos where you can help and what vehicle you can use. Saving this profile starts a review; it does not activate you as a driver yet.',
  },
  es: {
    title: 'Conducir como voluntario',
    body: 'Dile a Juntos dónde puedes ayudar y qué vehículo puedes usar. Guardar este perfil inicia una revisión; todavía no te activa como conductor.',
  },
} as const

export default async function VolunteerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub) redirect(`/${lang}/login`)

  return (
    <main className="shell narrow">
      <section className="panel">
        <p className="eyebrow">Juntos</p>
        <h1>{t.title}</h1>
        <p className="lead small">{t.body}</p>
        <VolunteerForm locale={lang} />
      </section>
    </main>
  )
}
