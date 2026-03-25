import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/battles/new', '/profile', '/onboarding']
const AUTH_PATHS = ['/login', '/signup']

const SUPPORTED_LOCALES = ['ko', 'en', 'ja', 'zh', 'es', 'fr']
const DEFAULT_LOCALE = 'en'

function detectLocale(acceptLang: string, cookieLocale?: string): string {
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale
  for (const part of acceptLang.split(',').map(l => l.split(';')[0].trim().toLowerCase())) {
    if (SUPPORTED_LOCALES.includes(part)) return part
    const short = part.split('-')[0]
    if (SUPPORTED_LOCALES.includes(short)) return short
  }
  return DEFAULT_LOCALE
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!supabaseUrl || supabaseUrl.includes('your-project')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getSession(): JWT를 로컬 쿠키에서 읽음 — 네트워크 요청 없음 → 미들웨어 타임아웃 방지
  // (보안 검증은 server action의 getUser()에서 처리)
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({
    data: { session: null },
  }))

  const user = session?.user ?? null
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  const isAuthPage = AUTH_PATHS.includes(pathname)
  const isOnboarding = pathname === '/onboarding'

  function redirect(pathname: string) {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const res = NextResponse.redirect(url)
    res.headers.set('Cache-Control', 'no-store, no-cache')
    return res
  }

  if (!user) {
    // 비로그인: 보호된 경로 → 로그인 페이지
    if (isProtected) return redirect('/login')
  } else {
    // 로그인 상태에서 auth 페이지 접근 → 홈으로
    if (isAuthPage) return redirect('/')
  }

  // 로케일 감지 후 쿠키 설정 (이미 올바른 쿠키가 있으면 덮어쓰지 않음)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  const acceptLang = request.headers.get('accept-language') ?? ''
  const locale = detectLocale(acceptLang, cookieLocale)
  if (cookieLocale !== locale) {
    supabaseResponse.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
