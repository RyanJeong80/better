'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Home, Shuffle, PlusCircle, Flame, User } from 'lucide-react'

export function BottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const NAV_ITEMS = [
    { href: '/', icon: Home, label: t('home') },
    { href: '/explore', icon: Shuffle, label: t('explore') },
    { href: '/battles/new', icon: PlusCircle, label: t('create'), primary: true },
    { href: '/hot', icon: Flame, label: t('hot') },
    { href: '/profile', icon: User, label: t('me') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-around px-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label, primary }) => {
          const resolvedHref = href === '/profile' && !isLoggedIn ? '/login' : href
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

          if (primary) {
            return (
              <Link
                key={href}
                href={resolvedHref}
                className="flex flex-col items-center gap-0.5 -mt-4"
              >
                <div style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  borderRadius: '50%',
                  width: 52,
                  height: 52,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                }}>
                  <Icon size={22} color="white" />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6366F1' }}>{label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={resolvedHref}
              className="flex flex-col items-center gap-0.5 py-2 px-3"
              style={{ color: isActive ? '#6366F1' : '#9CA3AF' }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500 }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
