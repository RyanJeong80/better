'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { User, BarChart2, Vote, Trophy, LogOut, X, ChevronRight } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { LevelBadge } from '@/components/ui/level-badge'
import type { UserInfo } from '@/app/(main)/page'

const SECTION_LABELS = ['랭킹', 'Better', 'Hot']

export function SwipeSections({
  rankingContent,
  betterContent,
  hotContent,
  user,
  active,
  onActiveChange,
}: {
  rankingContent: React.ReactNode
  betterContent: React.ReactNode
  hotContent: React.ReactNode
  user: UserInfo | null
  active: number
  onActiveChange: (v: number) => void
}) {
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)

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
    if (dx < 0 && active < 2) onActiveChange(active + 1)
    if (dx > 0 && active > 0) onActiveChange(active - 1)
  }

  const panels = [rankingContent, betterContent, hotContent]

  const menuItems = [
    { icon: <User size={18} />, label: '내 프로필', href: '/profile' },
    { icon: <BarChart2 size={18} />, label: '내가 올린 Better', href: '/profile' },
    { icon: <Vote size={18} />, label: '내 투표 기록', href: '/profile' },
    { icon: <Trophy size={18} />, label: '내 적중률 / 랭킹 확인', href: '/ranking' },
  ]

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
          만들기
        </Link>

        {/* 프로필 아이콘 / 로그인 버튼 */}
        {user ? (
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.82rem', fontWeight: 800, color: 'white', flexShrink: 0,
            }}>
              {user.initial}
            </div>
            <LevelBadge level={user.levelInfo} size="xs" showName={false} />
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
            로그인
          </Link>
        )}
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
                WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
              }}
            >
              {content}
            </div>
          ))}
        </div>
      </div>

      {/* ── 프로필 메뉴 (bottom sheet) ── */}
      {menuOpen && user && (
        <>
          {/* 배경 오버레이 */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.45)',
            }}
          />
          {/* 시트 */}
          <div
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'var(--color-background)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
              animation: '_slideUpSheet 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            <style>{`
              @keyframes _slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
            `}</style>

            {/* 닫기 핸들 */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--color-border)' }} />
            </div>

            {/* 유저 정보 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px 16px',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 900, color: 'white',
              }}>
                {user.initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <p style={{
                    margin: 0, fontWeight: 800, fontSize: '1rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {user.name || '사용자'}
                  </p>
                  <LevelBadge level={user.levelInfo} size="xs" />
                </div>
                <p style={{
                  margin: 0, fontSize: '0.78rem', color: 'var(--color-muted-foreground)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--color-muted)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 메뉴 아이템 */}
            <div style={{ padding: '8px 0' }}>
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    textDecoration: 'none',
                    color: 'var(--color-foreground)',
                  }}
                >
                  <span style={{ color: '#6366F1', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600 }}>{item.label}</span>
                  <ChevronRight size={16} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
                </Link>
              ))}

              {/* 로그아웃 */}
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, paddingTop: 4 }}>
                <form action={signOut}>
                  <button
                    type="submit"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 20px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      color: '#EF4444',
                    }}
                  >
                    <LogOut size={18} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>로그아웃</span>
                  </button>
                </form>
              </div>
            </div>

            {/* iOS safe area */}
            <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
          </div>
        </>
      )}
    </div>
  )
}
