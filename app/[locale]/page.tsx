import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale, messages } from '@/lib/i18n'

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const copy = messages[locale]
  const otherLocale = locale === 'en' ? 'es' : 'en'

  return (
    <main className="page-shell">
      <section className="card">
        <h1 className="brand">Juntos</h1>
        <p className="tagline">{copy.tagline}</p>

        <div className="actions">
          <Link className="button button-primary" href={`/${locale}/ride/request`}>
            {copy.needRide}
          </Link>
          <Link className="button button-secondary" href={`/${locale}/driver/apply`}>
            {copy.giveRide}
          </Link>
          <Link className="button button-secondary" href={`/${locale}/community`}>
            {copy.volunteer}
          </Link>
        </div>

        <div className="language-row">
          <Link href={`/${otherLocale}`} className="button button-secondary">
            {locale === 'en' ? 'Español' : 'English'}
          </Link>
        </div>

        <p className="small">{copy.privacy}</p>
      </section>
    </main>
  )
}
