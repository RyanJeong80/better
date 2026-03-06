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

  if (!user) {
    // 비로그인: 보호된 경로 → 로그인 페이지
    if (isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  } else {
    const hasUsername = !!user.user_metadata?.username

    // 로그인 상태에서 auth 페이지 접근 → 적절한 곳으로
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = hasUsername ? '/' : '/onboarding'
      return NextResponse.redirect(url)
    }

    // username 미설정 시 온보딩으로 (온보딩 페이지 자체는 제외)
    if (!hasUsername && !isOnboarding) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
