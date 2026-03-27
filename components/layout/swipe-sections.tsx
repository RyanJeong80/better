'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import type { UserInfo } from '@/app/(main)/page'

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
          height: 48, flexShrink: 0,
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
          style={{
            fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            flexShrink: 0, lineHeight: 1,
          }}
        >
          Touched
        </span>

        {/* 중앙 spacer */}
        <div style={{ flex: 1 }} />

        {/* 만들기 버튼 */}
        {user ? (
          <button
            onClick={onOpenCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontWeight: 700, fontSize: '0.78rem',
              padding: '7px 13px', borderRadius: 999,
              border: 'none', cursor: 'pointer', flexShrink: 0, lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            <span style={{ fontSize: '1rem', marginTop: -1 }}>+</span>
            {t('nav.create')}
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontWeight: 700, fontSize: '0.78rem',
              padding: '7px 13px', borderRadius: 999,
              textDecoration: 'none', flexShrink: 0, lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            <span style={{ fontSize: '1rem', marginTop: -1 }}>+</span>
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
              background: active === 3
                ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                : 'var(--color-muted)',
              border: active === 3 ? 'none' : '2px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.82rem', fontWeight: 800,
              color: active === 3 ? 'white' : 'var(--color-foreground)',
              transition: 'all 0.2s',
            }}
          >
            {user.initial}
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              flexShrink: 0, fontSize: '0.75rem', fontWeight: 700,
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
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 150,
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 32,
                cursor: 'pointer',
                userSelect: 'none',
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                lineHeight: 1,
                padding: '8px 4px',
                animation: '_bounceXLeft 1.6s ease-in-out infinite',
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
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 150,
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 32,
                cursor: 'pointer',
                userSelect: 'none',
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                lineHeight: 1,
                padding: '8px 4px',
                animation: '_bounceXRight 1.6s ease-in-out infinite',
              }}
            >
              ›
            </button>
          )}

          {/* 첫 페이지 전용 하단 스와이프 힌트 */}
          {active === 0 && (
            <div
              style={{
                position: 'fixed',
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.7)',
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                zIndex: 150,
                pointerEvents: 'none',
              }}
            >
              <p style={{ fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', marginBottom: 4 }}>
                {t('hint.swipeNext')}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 20,
                  lineHeight: 1,
                  animation: '_bounceY 1.4s ease-in-out infinite',
                }}
              >
                ∨
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
