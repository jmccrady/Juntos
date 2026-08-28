export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

export const messages = {
  en: {
    tagline: 'Neighbors helping neighbors get where they need to go safely.',
    needRide: 'I need a ride',
    giveRide: 'I can give a ride',
    volunteer: 'Volunteer or community organization',
    privacy: 'Juntos does not ask about immigration or citizenship status.',
  },
  es: {
    tagline: 'Vecinos ayudando a vecinos a llegar seguros a donde necesitan ir.',
    needRide: 'Necesito un viaje',
    giveRide: 'Puedo ofrecer un viaje',
    volunteer: 'Voluntario u organización comunitaria',
    privacy: 'Juntos no pregunta sobre estatus migratorio ni ciudadanía.',
  },
} as const
