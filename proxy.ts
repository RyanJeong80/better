import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/battles/new', '/profile', '/onboarding']
const AUTH_PATHS = ['/login', '/signup']

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

  const { data, error } = await supabase.auth.getUser().catch(() => ({
    data: { user: null },
    error: new Error('fetch failed'),
  }))

  if (error) return supabaseResponse

  const user = data.user
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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
