'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Region = { id: string; name_en: string; name_es: string }

const copy = {
  en: {
    start: 'Available from',
    end: 'Available until',
    region: 'Service area for this window',
    noRegion: 'Use my general area / not listed',
    fallback: 'General service area fallback',
    submit: 'Add availability',
    saving: 'Saving…',
    error: 'We could not save that availability window.',
  },
  es: {
    start: 'Disponible desde',
    end: 'Disponible hasta',
    region: 'Área de servicio para este horario',
    noRegion: 'Usar mi área general / no aparece',
    fallback: 'Área general de servicio',
    submit: 'Agregar disponibilidad',
    saving: 'Guardando…',
    error: 'No pudimos guardar ese horario de disponibilidad.',
  },
} as const

export function AvailabilityForm({
  locale,
  defaultRegion,
  defaultRegionId,
  regions,
}: {
  locale: 'en' | 'es'
  defaultRegion: string
  defaultRegionId: string | null
  regions: Region[]
}) {
  const t = copy[locale]
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const regionName = (region: Region) => locale === 'es' ? region.name_es : region.name_en

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
      const selectedRegionId = String(formData.get('service_region_id') ?? '') || null
      const selectedRegion = selectedRegionId ? regions.find((region) => region.id === selectedRegionId) ?? null : null
      const fallbackRegion = String(formData.get('service_region') ?? '').trim().slice(0, 120) || null
      const serviceRegion = selectedRegion ? regionName(selectedRegion) : fallbackRegion
      const start = new Date(startRaw)
      const end = new Date(endRaw)

      if (!startRaw || !endRaw || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start || (selectedRegionId !== null && !selectedRegion)) {
        setMessage(t.error)
        return
      }

      const { error } = await supabase.from('driver_availability').insert({
        driver_id: driverId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        service_region: serviceRegion,
        service_region_id: selectedRegion?.id ?? null,
      })

      if (error) {
        setMessage(t.error)
        return
      }

      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({ is_accepting_rides: true, updated_at: new Date().toISOString() })
        .eq('user_id', driverId)

      if (profileError) {
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
      {regions.length > 0 ? (
        <label>
          {t.region}
          <select name="service_region_id" defaultValue={defaultRegionId ?? ''}>
            <option value="">{t.noRegion}</option>
            {regions.map((region) => <option key={region.id} value={region.id}>{regionName(region)}</option>)}
          </select>
        </label>
      ) : null}
      <label>{regions.length > 0 ? t.fallback : t.region}<input name="service_region" maxLength={120} defaultValue={defaultRegion} /></label>
      {message ? <div className="notice error">{message}</div> : null}
      <button className="button primary" type="submit" disabled={pending}>{pending ? t.saving : t.submit}</button>
    </form>
  )
}
