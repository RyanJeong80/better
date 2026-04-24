'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import type { UserInfo } from '@/app/(main)/page'
import { Capacitor } from '@capacitor/core'

export function SwipeSections({
  betterContent,
  hotContent,
  rankingContent,
  profileContent,
  user,
  active,
  onActiveChange,
  onOpenCreate,
  hideIndicator = false,
}: {
  betterContent: React.ReactNode
  hotContent: React.ReactNode
  rankingContent: React.ReactNode
  profileContent: React.ReactNode
  user: UserInfo | null
  active: number
  onActiveChange: (v: number) => void
  onOpenCreate?: () => void
  hideIndicator?: boolean
}) {
  const t = useTranslations()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // 안드로이드 상태바 색상/스타일 설정
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setBackgroundColor({ color: '#EDE4DA' })
      StatusBar.setStyle({ style: Style.Dark })
    })
  }, [])

  // 관리자 가상 유저 감지
  const [adminVU, setAdminVU] = useState<{ name: string } | null>(null)
  useEffect(() => {
    const sync = () => {
      try {
        const raw = sessionStorage.getItem('admin_virtual_user')
        setAdminVU(raw ? JSON.parse(raw) : null)
      } catch { setAdminVU(null) }
    }
    sync()
    window.addEventListener('adminUserChanged', sync)
    window.addEventListener('storage', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('adminUserChanged', sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0 && active < 3) onActiveChange(active + 1)
    if (dx > 0 && active > 0) onActiveChange(active - 1)
  }

  const panels = [betterContent, hotContent, rankingContent, profileContent]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        background: 'var(--color-background)',
      }}
    >
      {/* ── 상단 바 (48px) ── */}
      <div
        style={{
          height: 50, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          paddingLeft: 16, paddingRight: 12,
          background: '#EDE4DA',
          borderBottom: '1px solid rgba(61,43,31,0.12)',
          position: 'relative', zIndex: 1,
          gap: 8,
        }}
      >
        {/* 로고 */}
        <span
          onClick={() => onActiveChange(0)}
          style={{
            fontFamily: 'var(--font-josefin), "Josefin Sans", sans-serif',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#3D2B1F',
            fontSize: '20px',
            flexShrink: 0,
            lineHeight: 1,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          TOUCHED
        </span>

        {/* 관리자 모드 배지 */}
        {adminVU && (
          <button
            onClick={() => { window.location.href = '/admin' }}
            style={{
              backgroundColor: '#FF6B35', color: '#fff',
              border: 'none', borderRadius: 6,
              padding: '3px 8px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              flexShrink: 0,
            }}
          >
            ✏️ {adminVU.name}
          </button>
        )}

        {/* 중앙 spacer */}
        <div style={{ flex: 1 }} />

        {/* 만들기 버튼 — 실제 유저 또는 관리자 가상 유저 선택 시 활성 */}
        {(user || adminVU) ? (
          <button
            onClick={onOpenCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: adminVU && !user
                ? '#FF6B35'
                : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontWeight: 700, fontSize: '1rem',
              padding: '7px 13px', borderRadius: 999,
              border: 'none', cursor: 'pointer', flexShrink: 0, lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            <span style={{ fontSize: '1.125rem', marginTop: -1 }}>+</span>
            {t('nav.create')}
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontWeight: 700, fontSize: '1rem',
              padding: '7px 13px', borderRadius: 999,
              textDecoration: 'none', flexShrink: 0, lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            <span style={{ fontSize: '1.125rem', marginTop: -1 }}>+</span>
            {t('nav.create')}
          </Link>
        )}

        {/* 언어 변경 */}
        <LanguageSwitcher />

        {/* 프로필 아이콘 / 로그인 버튼 */}
        {user ? (
          <button
            onClick={() => onActiveChange(3)}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: user.avatarUrl
                ? 'transparent'
                : active === 3
                  ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                  : 'var(--color-muted)',
              border: active === 3 ? '2px solid #6366F1' : '2px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontWeight: 800,
              color: active === 3 ? 'white' : 'var(--color-foreground)',
              transition: 'all 0.2s',
              overflow: 'hidden', padding: 0,
            }}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user.initial
            )}
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              flexShrink: 0, fontSize: '1rem', fontWeight: 700,
              color: '#6366F1', textDecoration: 'none',
              padding: '5px 10px', borderRadius: 999,
              border: '1.5px solid #6366F1',
              lineHeight: 1,
            }}
          >
            {t('auth.login')}
          </Link>
        )}
      </div>

      {/* ── 스와이프 패널 영역 ── */}
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* 트랙: 4패널 가로 나열 */}
        <div
          style={{
            display: 'flex',
            width: '400%',
            height: '100%',
            transform: `translateX(calc(-${100 / 4}% * ${active}))`,
            transition: 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'transform',
          }}
        >
          {panels.map((content, i) => (
            <div
              key={i}
              style={{
                width: `${100 / 4}%`,
                height: '100%',
                overflowY: i === 0 ? 'hidden' : 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
              }}
            >
              {content}
            </div>
          ))}
        </div>

      </div>

      {/* ── 새 인디케이터: 좌우 꺽쇠 + 첫 페이지 하단 힌트 ── */}
      {!hideIndicator && (
        <>
          <style>{`
            @keyframes _bounceXLeft {
              0%, 100% { transform: translateX(0) translateY(-50%); }
              50%       { transform: translateX(-4px) translateY(-50%); }
            }
            @keyframes _bounceXRight {
              0%, 100% { transform: translateX(0) translateY(-50%); }
              50%       { transform: translateX(4px) translateY(-50%); }
            }
            @keyframes _bounceY {
              0%, 100% { transform: translateX(-50%) translateY(0); }
              50%       { transform: translateX(-50%) translateY(6px); }
            }
          `}</style>

          {/* 좌측 꺽쇠 */}
          {active > 0 && (
            <button
              onClick={() => onActiveChange(active - 1)}
              aria-label="previous section"
              style={{
                position: 'fixed',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 150,
                background: 'rgba(0,0,0,0.48)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 999,
                color: 'white',
                fontSize: 26,
                cursor: 'pointer',
                userSelect: 'none',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                lineHeight: 1,
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: '_bounceXLeft 1.6s ease-in-out infinite',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              ‹
            </button>
          )}

          {/* 우측 꺽쇠 */}
          {active < 3 && (
            <button
              onClick={() => onActiveChange(active + 1)}
              aria-label="next section"
              style={{
                position: 'fixed',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 150,
                background: 'rgba(0,0,0,0.48)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 999,
                color: 'white',
                fontSize: 26,
                cursor: 'pointer',
                userSelect: 'none',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                lineHeight: 1,
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: '_bounceXRight 1.6s ease-in-out infinite',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              ›
            </button>
          )}

        </>
      )}
    </div>
  )
}
