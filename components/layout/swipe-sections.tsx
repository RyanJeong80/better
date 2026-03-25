'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import type { UserInfo } from '@/app/(main)/page'

export function SwipeSections({
  rankingContent,
  betterContent,
  hotContent,
  profileContent,
  user,
  active,
  onActiveChange,
}: {
  rankingContent: React.ReactNode
  betterContent: React.ReactNode
  hotContent: React.ReactNode
  profileContent: React.ReactNode
  user: UserInfo | null
  active: number
  onActiveChange: (v: number) => void
}) {
  const t = useTranslations()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const SECTION_LABELS = [t('sections.ranking'), t('sections.better'), t('sections.hot'), t('sections.profile')]

  // 홈 마운트 중 body 스크롤 잠금
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

  const panels = [rankingContent, betterContent, hotContent, profileContent]

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
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-border)',
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
          Better
        </span>

        {/* 섹션 인디케이터 dots (중앙) */}
        <div
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6,
          }}
        >
          {panels.map((_, i) => (
            <button
              key={i}
              onClick={() => onActiveChange(i)}
              aria-label={SECTION_LABELS[i]}
              style={{
                width: active === i ? 20 : 7,
                height: 7,
                borderRadius: 999,
                background: active === i ? '#6366F1' : '#D1D5DB',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.22s cubic-bezier(0.25, 1, 0.5, 1)',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* 만들기 버튼 */}
        <Link
          href={user ? '/battles/new' : '/login'}
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
                overflowY: i === 1 ? 'hidden' : 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
              }}
            >
              {content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
