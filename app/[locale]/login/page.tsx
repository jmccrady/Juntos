import { sendMagicLink } from './actions'

const copy = {
  en: {
    title: 'Sign in to Juntos',
    body: 'Enter your email and we will send you a secure sign-in link.',
    email: 'Email address',
    submit: 'Send sign-in link',
    sent: 'Check your email for your secure Juntos sign-in link.',
    invalid: 'Enter a valid email address.',
    failed: 'We could not send the sign-in link. Try again.',
  },
  es: {
    title: 'Inicia sesión en Juntos',
    body: 'Ingresa tu correo electrónico y te enviaremos un enlace seguro para iniciar sesión.',
    email: 'Correo electrónico',
    submit: 'Enviar enlace de acceso',
    sent: 'Revisa tu correo para ver tu enlace seguro de acceso a Juntos.',
    invalid: 'Ingresa un correo electrónico válido.',
    failed: 'No pudimos enviar el enlace. Inténtalo de nuevo.',
  },
} as const

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ check_email?: string; error?: string }>
}) {
  const { locale } = await params
  const query = await searchParams
  const lang = locale === 'es' ? 'es' : 'en'
  const t = copy[lang]

  return (
    <main className="shell narrow">
      <section className="panel">
        <p className="eyebrow">Juntos</p>
        <h1>{t.title}</h1>
        <p className="lead small">{t.body}</p>
        {query.check_email === '1' ? <div className="notice success">{t.sent}</div> : null}
        {query.error === 'invalid' ? <div className="notice error">{t.invalid}</div> : null}
        {query.error === 'send' ? <div className="notice error">{t.failed}</div> : null}
        <form className="form" action={sendMagicLink}>
          <input type="hidden" name="locale" value={lang} />
          <label>{t.email}<input type="email" name="email" required autoComplete="email" /></label>
          <button className="button primary" type="submit">{t.submit}</button>
        </form>
      </section>
    </main>
  )
}
