import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function Header() {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        {/* 로고 */}
        <Link
          href="/"
          className="text-xl font-black tracking-tight"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Better
        </Link>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              {/* 데스크탑 전용 */}
              <nav className="hidden md:flex items-center gap-1">
                <NavLink href="/battles/new">+ 만들기</NavLink>
                <NavLink href="/profile">프로필</NavLink>
              </nav>
              {/* 모바일 전용 */}
              <Link
                href="/profile"
                className="flex md:hidden h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
              >
                {(user.user_metadata?.name ?? user.email ?? '?')[0].toUpperCase()}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </Link>
  )
}
