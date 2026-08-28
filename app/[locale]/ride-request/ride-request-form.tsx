'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const labels = {
  en: {
    pickup: 'Pickup area or trusted hub',
    pickupPlaceholder: 'Example: Pasadena or a community pickup hub',
    destination: 'Destination area or place',
    destinationPlaceholder: 'Example: Glen Burnie or a medical center',
    date: 'Date',
    time: 'Pickup time',
    riders: 'Number of riders',
    purpose: 'Trip purpose',
    notes: 'Accessibility, child seat, or other needs',
    privacy: 'For this first request, do not enter a home street address or other exact private location. Juntos will request exact pickup details only when they are operationally needed.',
    submit: 'Submit ride request',
    submitting: 'Submitting…',
    error: 'We could not save your ride request. Please try again.',
    signIn: 'Please sign in before requesting a ride.',
    purposes: ['Work', 'Doctor', 'Grocery', 'Church', 'School', 'Legal appointment', 'Other'],
  },
  es: {
    pickup: 'Área de recogida o punto comunitario',
    pickupPlaceholder: 'Ejemplo: Pasadena o un punto comunitario',
    destination: 'Área o lugar de destino',
    destinationPlaceholder: 'Ejemplo: Glen Burnie o un centro médico',
    date: 'Fecha',
    time: 'Hora de recogida',
    riders: 'Número de pasajeros',
    purpose: 'Motivo del viaje',
    notes: 'Accesibilidad, asiento infantil u otras necesidades',
    privacy: 'En esta primera solicitud, no ingreses la dirección exacta de tu casa ni otra ubicación privada. Juntos solicitará los detalles exactos solo cuando sean necesarios para coordinar el viaje.',
    submit: 'Enviar solicitud',
    submitting: 'Enviando…',
    error: 'No pudimos guardar tu solicitud. Inténtalo de nuevo.',
    signIn: 'Inicia sesión antes de solicitar un viaje.',
    purposes: ['Trabajo', 'Médico', 'Supermercado', 'Iglesia', 'Escuela', 'Cita legal', 'Otro'],
  },
} as const

export function RideRequestForm({ locale }: { locale: 'en' | 'es' }) {
  const t = labels[locale]
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
      const riderId = claimsData?.claims?.sub

      if (claimsError || !riderId) {
        setMessage(t.signIn)
        router.push(`/${locale}/login`)
        return
      }

      const pickupArea = String(formData.get('pickup_area') ?? '').trim().slice(0, 200)
      const destinationArea = String(formData.get('destination') ?? '').trim().slice(0, 200)
      const date = String(formData.get('date') ?? '')
      const time = String(formData.get('time') ?? '')
      const riderCount = Number(formData.get('rider_count') ?? 1)
      const purpose = String(formData.get('purpose') ?? '').trim().slice(0, 80) || null
      const needs = String(formData.get('needs') ?? '').trim().slice(0, 500) || null

      if (!pickupArea || !destinationArea || !date || !time || !Number.isInteger(riderCount) || riderCount < 1 || riderCount > 8) {
        setMessage(t.error)
        return
      }

      const requestedAt = new Date(`${date}T${time}:00`)
      if (Number.isNaN(requestedAt.getTime())) {
        setMessage(t.error)
        return
      }

      const { error } = await supabase.from('ride_requests').insert({
        rider_id: riderId,
        pickup_area: pickupArea,
        destination_area: destinationArea,
        requested_at: requestedAt.toISOString(),
        rider_count: riderCount,
        purpose,
        needs,
      })

      if (error) {
        setMessage(t.error)
        return
      }

      router.push(`/${locale}/dashboard`)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="form" action={submit}>
      <label>{t.pickup}<input name="pickup_area" maxLength={200} placeholder={t.pickupPlaceholder} required /></label>
      <label>{t.destination}<input name="destination" maxLength={200} placeholder={t.destinationPlaceholder} required /></label>
      <div className="privacy-note">🔒 {t.privacy}</div>
      <div className="form-grid">
        <label>{t.date}<input name="date" type="date" required /></label>
        <label>{t.time}<input name="time" type="time" required /></label>
      </div>
      <label>{t.riders}<input name="rider_count" type="number" min="1" max="8" defaultValue="1" required /></label>
      <label>{t.purpose}<select name="purpose" defaultValue=""><option value="">—</option>{t.purposes.map((purpose) => <option key={purpose}>{purpose}</option>)}</select></label>
      <label>{t.notes}<textarea name="needs" rows={4} maxLength={500} /></label>
      {message ? <div className="notice error">{message}</div> : null}
      <button className="button primary" type="submit" disabled={pending}>{pending ? t.submitting : t.submit}</button>
    </form>
  )
}
