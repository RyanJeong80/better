'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  hideIndicator = false,
}: {
  betterContent: React.ReactNode
  hotContent: React.ReactNode
  rankingContent: React.ReactNode
  profileContent: React.ReactNode
  user: UserInfo | null
  active: number
  onActiveChange: (v: number) => void
  hideIndicator?: boolean
}) {
  const t = useTranslations()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // 패널 순서: 0=랜덤Better, 1=Hot Better, 2=랭킹, 3=프로필
  const SECTION_LABELS = [
    t('sections.better'),
    t('sections.hot'),
    t('sections.ranking'),
    t('sections.profile'),
  ]

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

      {/* ── 하단 섹션 인디케이터 (fixed) ── */}
      {!hideIndicator && (
        <div
          style={{
            position: 'fixed',
            bottom: 14,
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 999,
              padding: '3px 4px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              pointerEvents: 'auto',
              maxHeight: 24,
            }}
          >
            {/* 이전 화살표 */}
            <button
              onClick={() => active > 0 && onActiveChange(active - 1)}
              disabled={active === 0}
              style={{
                width: 20, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none',
                cursor: active > 0 ? 'pointer' : 'default',
                color: active > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                flexShrink: 0,
                transition: 'color 0.15s',
                padding: 0,
              }}
              aria-label="previous section"
            >
              <ChevronLeft size={11} strokeWidth={2.5} />
            </button>

            {/* 섹션 번호들 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1, padding: '0 2px' }}>
              {SECTION_LABELS.map((label, i) => {
                const isCurrent = i === active
                return (
                  <button
                    key={i}
                    onClick={() => onActiveChange(i)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '1px 4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 4,
                      transition: 'all 0.2s',
                      lineHeight: 1,
                    }}
                    aria-label={label}
                  >
                    <span style={{
                      fontSize: isCurrent ? '0.8rem' : '0.6rem',
                      fontWeight: isCurrent ? 900 : 500,
                      color: isCurrent ? 'white' : 'rgba(255,255,255,0.3)',
                      lineHeight: 1,
                      transition: 'all 0.2s',
                    }}>
                      {i + 1}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 구분점 + 섹션명 */}
            <span style={{
              fontSize: '0.58rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              padding: '0 1px 0 3px',
              userSelect: 'none',
              lineHeight: 1,
            }}>·</span>
            <span style={{
              fontSize: '0.62rem', fontWeight: 800,
              color: 'white',
              whiteSpace: 'nowrap',
              padding: '0 3px',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>
              {SECTION_LABELS[active]}
            </span>

            {/* 다음 화살표 */}
            <button
              onClick={() => active < 3 && onActiveChange(active + 1)}
              disabled={active === 3}
              style={{
                width: 20, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none',
                cursor: active < 3 ? 'pointer' : 'default',
                color: active < 3 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
                flexShrink: 0,
                transition: 'color 0.15s',
                padding: 0,
              }}
              aria-label="next section"
            >
              <ChevronRight size={11} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
