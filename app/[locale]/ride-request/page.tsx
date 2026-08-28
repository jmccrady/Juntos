const labels = {
  en: {
    title: 'Request a ride',
    subtitle: 'Share only what is needed to arrange your trip.',
    pickup: 'Pickup area or trusted hub',
    destination: 'Destination',
    date: 'Date',
    time: 'Pickup time',
    riders: 'Number of riders',
    purpose: 'Trip purpose',
    notes: 'Accessibility, child seat, or other needs',
    submit: 'Submit ride request',
    purposes: ['Work', 'Doctor', 'Grocery', 'Church', 'School', 'Legal appointment', 'Other'],
  },
  es: {
    title: 'Solicitar un viaje',
    subtitle: 'Comparte solo lo necesario para coordinar tu viaje.',
    pickup: 'Área de recogida o punto comunitario',
    destination: 'Destino',
    date: 'Fecha',
    time: 'Hora de recogida',
    riders: 'Número de pasajeros',
    purpose: 'Motivo del viaje',
    notes: 'Accesibilidad, asiento infantil u otras necesidades',
    submit: 'Enviar solicitud',
    purposes: ['Trabajo', 'Médico', 'Supermercado', 'Iglesia', 'Escuela', 'Cita legal', 'Otro'],
  },
} as const

export default async function RideRequestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const lang = locale === 'es' ? 'es' : 'en'
  const t = labels[lang]

  return (
    <main className="shell narrow">
      <section className="panel">
        <p className="eyebrow">Juntos</p>
        <h1>{t.title}</h1>
        <p className="lead small">{t.subtitle}</p>
        <form className="form" action="#" method="post">
          <label>{t.pickup}<input name="pickup_area" required autoComplete="street-address" /></label>
          <label>{t.destination}<input name="destination" required /></label>
          <div className="form-grid">
            <label>{t.date}<input name="date" type="date" required /></label>
            <label>{t.time}<input name="time" type="time" required /></label>
          </div>
          <label>{t.riders}<input name="rider_count" type="number" min="1" max="8" defaultValue="1" required /></label>
          <label>{t.purpose}<select name="purpose" defaultValue=""><option value="" disabled>—</option>{t.purposes.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>{t.notes}<textarea name="needs" rows={4} maxLength={500} /></label>
          <button className="button primary" type="submit">{t.submit}</button>
        </form>
      </section>
    </main>
  )
}
