'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const copy = {
  en: {
    start: 'Available from',
    end: 'Available until',
    region: 'Service area for this window',
    submit: 'Add availability',
    saving: 'Saving…',
    error: 'We could not save that availability window.',
  },
  es: {
    start: 'Disponible desde',
    end: 'Disponible hasta',
    region: 'Área de servicio para este horario',
    submit: 'Agregar disponibilidad',
    saving: 'Guardando…',
    error: 'No pudimos guardar ese horario de disponibilidad.',
  },
} as const

export function AvailabilityForm({ locale, defaultRegion }: { locale: 'en' | 'es'; defaultRegion: string }) {
  const t = copy[locale]
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data, error: claimsError } = await supabase.auth.getClaims()
      const driverId = data?.claims?.sub
      if (claimsError || !driverId) {
        router.push(`/${locale}/login`)
        return
      }

      const startRaw = String(formData.get('starts_at') ?? '')
      const endRaw = String(formData.get('ends_at') ?? '')
      const serviceRegion = String(formData.get('service_region') ?? '').trim().slice(0, 120) || null
      const start = new Date(startRaw)
      const end = new Date(endRaw)

      if (!startRaw || !endRaw || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        setMessage(t.error)
        return
      }

      const { error } = await supabase.from('driver_availability').insert({
        driver_id: driverId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        service_region: serviceRegion,
      })

      if (error) {
        setMessage(t.error)
        return
      }

      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="form compact-form" action={submit}>
      <div className="form-grid">
        <label>{t.start}<input name="starts_at" type="datetime-local" required /></label>
        <label>{t.end}<input name="ends_at" type="datetime-local" required /></label>
      </div>
      <label>{t.region}<input name="service_region" maxLength={120} defaultValue={defaultRegion} /></label>
      {message ? <div className="notice error">{message}</div> : null}
      <button className="button primary" type="submit" disabled={pending}>{pending ? t.saving : t.submit}</button>
    </form>
  )
}
