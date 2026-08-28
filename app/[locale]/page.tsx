import Link from 'next/link'

const copy = {
  en: {
    eyebrow: 'Neighbors helping neighbors',
    title: 'A ride when you need one. A way to help when you can.',
    body: 'Juntos connects community members who need transportation with trusted volunteer drivers and dispatchers.',
    need: 'I need a ride',
    give: 'I can give a ride',
    privacy: 'Privacy first: Juntos does not ask about immigration status or citizenship.',
    switcher: 'Español',
  },
  es: {
    eyebrow: 'Vecinos ayudando a vecinos',
    title: 'Un viaje cuando lo necesitas. Una forma de ayudar cuando puedes.',
    body: 'Juntos conecta a miembros de la comunidad que necesitan transporte con conductores voluntarios y coordinadores de confianza.',
    need: 'Necesito un viaje',
    give: 'Puedo ofrecer un viaje',
    privacy: 'Privacidad primero: Juntos no pregunta sobre estatus migratorio ni ciudadanía.',
    switcher: 'English',
  },
} as const

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]
  const other = lang === 'en' ? 'es' : 'en'

  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">Juntos</div>
        <Link href={`/${other}`} className="language">{t.switcher}</Link>
      </nav>
      <section className="hero">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="lead">{t.body}</p>
        <div className="actions">
          <Link className="button primary" href={`/${lang}/ride-request`}>{t.need}</Link>
          <Link className="button secondary" href={`/${lang}/volunteer`}>{t.give}</Link>
        </div>
        <div className="privacy-card">🔒 {t.privacy}</div>
      </section>
    </main>
  )
}
