'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Region = { id: string; name_en: string; name_es: string }

const copy = {
  en: {
    region: 'Primary service area',
    noRegion: 'Not listed / enter a general area below',
    regionFallback: 'General service area if not listed',
    regionHint: 'Example: Pasadena / Anne Arundel County',
    languages: 'Languages you can use with riders',
    english: 'English',
    spanish: 'Spanish',
    vehicle: 'Vehicle',
    make: 'Make',
    model: 'Model',
    color: 'Color',
    year: 'Model year',
    seats: 'Passenger seats available',
    wheelchair: 'Wheelchair accessible vehicle',
    submit: 'Save volunteer profile',
    saving: 'Saving…',
    success: 'Your volunteer profile is saved and pending Juntos review.',
    error: 'We could not save your volunteer profile. Please try again.',
    privacy: 'Do not enter driver-license numbers, insurance policy numbers, immigration information, or other sensitive documents here.',
  },
  es: {
    region: 'Área principal de servicio',
    noRegion: 'No aparece / ingresa un área general abajo',
    regionFallback: 'Área general de servicio si no aparece',
    regionHint: 'Ejemplo: Pasadena / Condado de Anne Arundel',
    languages: 'Idiomas que puedes usar con pasajeros',
    english: 'Inglés',
    spanish: 'Español',
    vehicle: 'Vehículo',
    make: 'Marca',
    model: 'Modelo',
    color: 'Color',
    year: 'Año del modelo',
    seats: 'Asientos disponibles para pasajeros',
    wheelchair: 'Vehículo accesible para silla de ruedas',
    submit: 'Guardar perfil de voluntario',
    saving: 'Guardando…',
    success: 'Tu perfil de voluntario se guardó y está pendiente de revisión por Juntos.',
    error: 'No pudimos guardar tu perfil. Inténtalo de nuevo.',
    privacy: 'No ingreses números de licencia de conducir, pólizas de seguro, información migratoria ni documentos sensibles aquí.',
  },
} as const

export function VolunteerForm({ locale, regions }: { locale: 'en' | 'es'; regions: Region[] }) {
  const t = copy[locale]
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const regionName = (region: Region) => locale === 'es' ? region.name_es : region.name_en

  async function submit(formData: FormData) {
    setPending(true)
    setMessage(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
      const driverId = claimsData?.claims?.sub

      if (claimsError || !driverId) {
        router.push(`/${locale}/login`)
        return
      }

      const serviceRegionId = String(formData.get('service_region_id') ?? '') || null
      const selectedRegion = serviceRegionId ? regions.find((region) => region.id === serviceRegionId) ?? null : null
      const fallbackRegion = String(formData.get('service_region') ?? '').trim().slice(0, 120)
      const serviceRegion = selectedRegion ? regionName(selectedRegion) : fallbackRegion
      const make = String(formData.get('make') ?? '').trim().slice(0, 60)
      const model = String(formData.get('model') ?? '').trim().slice(0, 60)
      const color = String(formData.get('color') ?? '').trim().slice(0, 40)
      const rawYear = String(formData.get('model_year') ?? '').trim()
      const modelYear = rawYear ? Number(rawYear) : null
      const seatCapacity = Number(formData.get('seat_capacity') ?? 1)
      const wheelchairAccessible = formData.get('wheelchair_accessible') === 'on'
      const languages = ['en', 'es'].filter((language) => formData.get(`language_${language}`) === 'on')

      const validRegion = !serviceRegionId || Boolean(selectedRegion)
      if (!serviceRegion || !validRegion || !make || !model || !color || languages.length === 0 || !Number.isInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 12) {
        setMessage(t.error)
        return
      }

      if (modelYear !== null && (!Number.isInteger(modelYear) || modelYear < 1980 || modelYear > 2100)) {
        setMessage(t.error)
        return
      }

      const { error: profileError } = await supabase.from('driver_profiles').upsert({
        user_id: driverId,
        service_region: serviceRegion,
        service_region_id: selectedRegion?.id ?? null,
        languages,
        is_accepting_rides: false,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        setMessage(t.error)
        return
      }

      const { data: existingVehicle, error: vehicleLookupError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('driver_id', driverId)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (vehicleLookupError) {
        setMessage(t.error)
        return
      }

      const vehicle = {
        driver_id: driverId,
        make,
        model,
        color,
        model_year: modelYear,
        seat_capacity: seatCapacity,
        wheelchair_accessible: wheelchairAccessible,
        active: true,
        updated_at: new Date().toISOString(),
      }

      const vehicleWrite = existingVehicle
        ? supabase.from('vehicles').update(vehicle).eq('id', existingVehicle.id)
        : supabase.from('vehicles').insert(vehicle)

      const { error: vehicleError } = await vehicleWrite
      if (vehicleError) {
        setMessage(t.error)
        return
      }

      setSuccess(true)
      setMessage(t.success)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="form" action={submit}>
      {regions.length > 0 ? (
        <label>
          {t.region}
          <select name="service_region_id" defaultValue="">
            <option value="">{t.noRegion}</option>
            {regions.map((region) => <option key={region.id} value={region.id}>{regionName(region)}</option>)}
          </select>
        </label>
      ) : null}
      <label>
        {regions.length > 0 ? t.regionFallback : t.region}
        <input name="service_region" maxLength={120} placeholder={t.regionHint} />
      </label>

      <fieldset className="fieldset">
        <legend>{t.languages}</legend>
        <label className="check-row"><input type="checkbox" name="language_en" defaultChecked /> {t.english}</label>
        <label className="check-row"><input type="checkbox" name="language_es" /> {t.spanish}</label>
      </fieldset>

      <h2 className="section-title">{t.vehicle}</h2>
      <div className="form-grid">
        <label>{t.make}<input name="make" maxLength={60} required /></label>
        <label>{t.model}<input name="model" maxLength={60} required /></label>
      </div>
      <div className="form-grid">
        <label>{t.color}<input name="color" maxLength={40} required /></label>
        <label>{t.year}<input name="model_year" type="number" min="1980" max="2100" /></label>
      </div>
      <label>{t.seats}<input name="seat_capacity" type="number" min="1" max="12" defaultValue="3" required /></label>
      <label className="check-row"><input type="checkbox" name="wheelchair_accessible" /> {t.wheelchair}</label>

      <div className="privacy-note">🔒 {t.privacy}</div>
      {message ? <div className={`notice ${success ? 'success' : 'error'}`}>{message}</div> : null}
      <button className="button primary" type="submit" disabled={pending}>{pending ? t.saving : t.submit}</button>
    </form>
  )
}
