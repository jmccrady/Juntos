const copy = {
  en: { title: 'Volunteer to drive', body: 'Driver onboarding is the next Sprint 0 workflow. We will add verification, vehicle capacity, availability, and service-area setup here.' },
  es: { title: 'Conducir como voluntario', body: 'La incorporación de conductores es el próximo flujo de Sprint 0. Aquí agregaremos verificación, capacidad del vehículo, disponibilidad y área de servicio.' },
} as const

export default async function VolunteerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = copy[locale === 'es' ? 'es' : 'en']
  return <main className="shell narrow"><section className="panel"><p className="eyebrow">Juntos</p><h1>{t.title}</h1><p className="lead small">{t.body}</p></section></main>
}
