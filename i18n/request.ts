import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

const SUPPORTED_LOCALES = ['ko', 'en', 'ja', 'zh', 'es', 'fr']
const DEFAULT_LOCALE = 'en'

async function detectLocale(): Promise<string> {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale

  const acceptLang = headerStore.get('accept-language') ?? ''
  for (const part of acceptLang.split(',').map(l => l.split(';')[0].trim().toLowerCase())) {
    if (SUPPORTED_LOCALES.includes(part)) return part
    const short = part.split('-')[0]
    if (SUPPORTED_LOCALES.includes(short)) return short
  }

  return DEFAULT_LOCALE
}

export default getRequestConfig(async () => {
  const locale = await detectLocale()
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
