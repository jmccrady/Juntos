'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const HUB_TYPES = new Set(['community', 'church', 'business', 'medical', 'school', 'other'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function localeFrom(formData: FormData) {
  return formData.get('locale') === 'es' ? 'es' : 'en'
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) throw new Error('Authentication required')

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (roleError || !roles?.some(({ role }) => role === 'admin')) throw new Error('Admin role required')
  return supabase
}

export async function createRegionAction(formData: FormData) {
  const locale = localeFrom(formData)
  const nameEn = String(formData.get('name_en') ?? '').trim().slice(0, 120)
  const nameEs = String(formData.get('name_es') ?? '').trim().slice(0, 120)
  const slug = slugify(String(formData.get('slug') ?? '').trim() || nameEn)
  if (!nameEn || !nameEs || !slug) throw new Error('Region names are required')

  const supabase = await requireAdmin()
  const { error } = await supabase.from('service_regions').insert({ slug, name_en: nameEn, name_es: nameEs })
  if (error) throw new Error(error.message)
  revalidatePath(`/${locale}/admin/operations`)
}

export async function createHubAction(formData: FormData) {
  const locale = localeFrom(formData)
  const serviceRegionId = String(formData.get('service_region_id') ?? '')
  const nameEn = String(formData.get('name_en') ?? '').trim().slice(0, 160)
  const nameEs = String(formData.get('name_es') ?? '').trim().slice(0, 160)
  const addressText = String(formData.get('address_text') ?? '').trim().slice(0, 240)
  const hubType = String(formData.get('hub_type') ?? 'community')
  const instructionsEn = String(formData.get('instructions_en') ?? '').trim().slice(0, 500) || null
  const instructionsEs = String(formData.get('instructions_es') ?? '').trim().slice(0, 500) || null

  if (!UUID_PATTERN.test(serviceRegionId) || !nameEn || !nameEs || !addressText || !HUB_TYPES.has(hubType)) {
    throw new Error('Invalid hub configuration')
  }

  const supabase = await requireAdmin()
  const { error } = await supabase.from('pickup_hubs').insert({
    service_region_id: serviceRegionId,
    name_en: nameEn,
    name_es: nameEs,
    address_text: addressText,
    hub_type: hubType,
    instructions_en: instructionsEn,
    instructions_es: instructionsEs,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/${locale}/admin/operations`)
  revalidatePath(`/${locale}/ride-request`)
}

export async function setRegionActiveAction(formData: FormData) {
  const locale = localeFrom(formData)
  const id = String(formData.get('id') ?? '')
  const active = formData.get('active') === 'true'
  if (!UUID_PATTERN.test(id)) throw new Error('Invalid region')

  const supabase = await requireAdmin()
  const { error } = await supabase.from('service_regions').update({ active, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/${locale}/admin/operations`)
  revalidatePath(`/${locale}/ride-request`)
  revalidatePath(`/${locale}/volunteer`)
  revalidatePath(`/${locale}/driver`)
}

export async function setHubActiveAction(formData: FormData) {
  const locale = localeFrom(formData)
  const id = String(formData.get('id') ?? '')
  const active = formData.get('active') === 'true'
  if (!UUID_PATTERN.test(id)) throw new Error('Invalid hub')

  const supabase = await requireAdmin()
  const { error } = await supabase.from('pickup_hubs').update({ active, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/${locale}/admin/operations`)
  revalidatePath(`/${locale}/ride-request`)
}
