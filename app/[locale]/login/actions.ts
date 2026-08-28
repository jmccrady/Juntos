'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function sendMagicLink(formData: FormData) {
  const locale = formData.get('locale') === 'es' ? 'es' : 'en'
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    redirect(`/${locale}/login?error=invalid`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?next=/${locale}/dashboard`,
      data: { preferred_language: locale },
    },
  })

  if (error) {
    redirect(`/${locale}/login?error=send`)
  }

  redirect(`/${locale}/login?check_email=1`)
}
