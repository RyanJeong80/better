'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const SECTION_LABELS = ['랭킹', 'Better', 'Hot']

export function SwipeSections({
  rankingContent,
  betterContent,
  hotContent,
  isLoggedIn,
  targetPanel,
}: {
  rankingContent: React.ReactNode
  betterContent: React.ReactNode
  hotContent: React.ReactNode
  isLoggedIn: boolean
  targetPanel?: number
}) {
  const [active, setActive] = useState(1) // 0=랭킹, 1=랜덤Better, 2=Top100

  // targetPanel prop이 바뀌면 (예: /?id=X 로 이동) 해당 패널로 즉시 전환
  useEffect(() => {
    if (targetPanel !== undefined) {
      setActive(targetPanel)
    }
  }, [targetPanel])
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

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
    // 수평 이동이 수직보다 크고, 50px 이상일 때만 스와이프
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0 && active < 2) setActive(v => v + 1)
    if (dx > 0 && active > 0) setActive(v => v - 1)
  }

  const panels = [rankingContent, betterContent, hotContent]

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
              onClick={() => setActive(i)}
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
          href={isLoggedIn ? '/battles/new' : '/login'}
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
          만들기
        </Link>
      </div>

      {/* ── 스와이프 패널 영역 ── */}
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* 트랙: 3패널 가로 나열 */}
        <div
          style={{
            display: 'flex',
            width: '300%',
            height: '100%',
            transform: `translateX(calc(-${100 / 3}% * ${active}))`,
            transition: 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'transform',
          }}
        >
          {panels.map((content, i) => (
            <div
              key={i}
              style={{
                width: `${100 / 3}%`,
                height: '100%',
                overflowY: i === 1 ? 'hidden' : 'auto',
                overflowX: 'hidden',
                // iOS 모멘텀 스크롤
                WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
              }}
            >
              {/* 패딩은 각 패널 콘텐츠에서 직접 처리 */}
              {content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
