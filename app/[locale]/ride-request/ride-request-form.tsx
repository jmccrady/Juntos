'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Region = { id: string; name_en: string; name_es: string }
type Hub = { id: string; service_region_id: string; name_en: string; name_es: string; address_text: string }

const labels = {
  en: {
    pickupHub: 'Trusted pickup hub (optional)',
    noHub: 'I am not using a trusted hub',
    pickupRegion: 'Pickup service area (optional)',
    destinationRegion: 'Destination service area (optional)',
    noRegion: 'Choose later / not listed',
    pickup: 'General pickup area if not using a hub',
    pickupPlaceholder: 'Example: Pasadena — do not enter a home street address',
    destination: 'Destination area or place',
    destinationPlaceholder: 'Example: Glen Burnie or a medical center',
    date: 'Date',
    time: 'Pickup time',
    riders: 'Number of riders',
    purpose: 'Trip purpose',
    notes: 'Accessibility, child seat, or other needs',
    privacy: 'Do not enter a home street address or another exact private location here. Trusted hub addresses are public operational locations; private pickup details will be requested only when needed for an assigned ride.',
    submit: 'Submit ride request',
    submitting: 'Submitting…',
    error: 'We could not save your ride request. Please try again.',
    signIn: 'Please sign in before requesting a ride.',
    purposes: ['Work', 'Doctor', 'Grocery', 'Church', 'School', 'Legal appointment', 'Other'],
  },
  es: {
    pickupHub: 'Punto de recogida de confianza (opcional)',
    noHub: 'No usaré un punto comunitario',
    pickupRegion: 'Área de servicio de recogida (opcional)',
    destinationRegion: 'Área de servicio de destino (opcional)',
    noRegion: 'Elegir después / no aparece',
    pickup: 'Área general de recogida si no usas un punto comunitario',
    pickupPlaceholder: 'Ejemplo: Pasadena — no ingreses la dirección exacta de tu casa',
    destination: 'Área o lugar de destino',
    destinationPlaceholder: 'Ejemplo: Glen Burnie o un centro médico',
    date: 'Fecha',
    time: 'Hora de recogida',
    riders: 'Número de pasajeros',
    purpose: 'Motivo del viaje',
    notes: 'Accesibilidad, asiento infantil u otras necesidades',
    privacy: 'No ingreses la dirección exacta de tu casa ni otra ubicación privada aquí. Las direcciones de puntos comunitarios son ubicaciones operativas públicas; los detalles privados se solicitarán solo cuando sean necesarios para un viaje asignado.',
    submit: 'Enviar solicitud',
    submitting: 'Enviando…',
    error: 'No pudimos guardar tu solicitud. Inténtalo de nuevo.',
    signIn: 'Inicia sesión antes de solicitar un viaje.',
    purposes: ['Trabajo', 'Médico', 'Supermercado', 'Iglesia', 'Escuela', 'Cita legal', 'Otro'],
  },
} as const

export function RideRequestForm({ locale, regions, hubs }: { locale: 'en' | 'es'; regions: Region[]; hubs: Hub[] }) {
  const t = labels[locale]
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedHubId, setSelectedHubId] = useState('')

  const selectedHub = hubs.find((hub) => hub.id === selectedHubId) ?? null
  const nameForRegion = (region: Region) => locale === 'es' ? region.name_es : region.name_en
  const nameForHub = (hub: Hub) => locale === 'es' ? hub.name_es : hub.name_en

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

      const hubId = String(formData.get('pickup_hub_id') ?? '')
      const hub = hubs.find((candidate) => candidate.id === hubId) ?? null
      const selectedPickupRegionId = String(formData.get('pickup_region_id') ?? '') || null
      const destinationRegionId = String(formData.get('destination_region_id') ?? '') || null
      const pickupAreaInput = String(formData.get('pickup_area') ?? '').trim().slice(0, 200)
      const pickupArea = hub ? nameForHub(hub) : pickupAreaInput
      const pickupRegionId = hub?.service_region_id ?? selectedPickupRegionId
      const destinationArea = String(formData.get('destination') ?? '').trim().slice(0, 200)
      const date = String(formData.get('date') ?? '')
      const time = String(formData.get('time') ?? '')
      const riderCount = Number(formData.get('rider_count') ?? 1)
      const purpose = String(formData.get('purpose') ?? '').trim().slice(0, 80) || null
      const needs = String(formData.get('needs') ?? '').trim().slice(0, 500) || null

      const validPickupRegion = !pickupRegionId || regions.some((region) => region.id === pickupRegionId)
      const validDestinationRegion = !destinationRegionId || regions.some((region) => region.id === destinationRegionId)

      if (!pickupArea || !destinationArea || !date || !time || !validPickupRegion || !validDestinationRegion || !Number.isInteger(riderCount) || riderCount < 1 || riderCount > 8) {
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
        pickup_region_id: pickupRegionId,
        destination_region_id: destinationRegionId,
        pickup_hub_id: hub?.id ?? null,
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
      {hubs.length > 0 ? (
        <label>
          {t.pickupHub}
          <select name="pickup_hub_id" value={selectedHubId} onChange={(event) => setSelectedHubId(event.target.value)}>
            <option value="">{t.noHub}</option>
            {hubs.map((hub) => <option key={hub.id} value={hub.id}>{nameForHub(hub)} · {hub.address_text}</option>)}
          </select>
        </label>
      ) : null}

      {!selectedHub ? (
        <>
          {regions.length > 0 ? (
            <label>
              {t.pickupRegion}
              <select name="pickup_region_id" defaultValue="">
                <option value="">{t.noRegion}</option>
                {regions.map((region) => <option key={region.id} value={region.id}>{nameForRegion(region)}</option>)}
              </select>
            </label>
          ) : null}
          <label>{t.pickup}<input name="pickup_area" maxLength={200} placeholder={t.pickupPlaceholder} required /></label>
        </>
      ) : (
        <div className="privacy-note"><strong>{nameForHub(selectedHub)}</strong><br />{selectedHub.address_text}</div>
      )}

      {regions.length > 0 ? (
        <label>
          {t.destinationRegion}
          <select name="destination_region_id" defaultValue="">
            <option value="">{t.noRegion}</option>
            {regions.map((region) => <option key={region.id} value={region.id}>{nameForRegion(region)}</option>)}
          </select>
        </label>
      ) : null}

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
