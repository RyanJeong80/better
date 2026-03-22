'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Flame } from 'lucide-react'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'
import type { PanelHotEntry } from '@/app/api/panels/hot/route'

const CAT_COLOR: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#DBEAFE', text: '#1D4ED8' },
  appearance: { bg: '#FCE7F3', text: '#9D174D' },
  love:       { bg: '#FFE4E6', text: '#BE123C' },
  shopping:   { bg: '#FEF3C7', text: '#B45309' },
  food:       { bg: '#FFEDD5', text: '#C2410C' },
  it:         { bg: '#EDE9FE', text: '#6D28D9' },
  decision:   { bg: '#DCFCE7', text: '#15803D' },
}

const RANK_STYLE: Record<number, { bg: string; color: string }> = {
  1: { bg: '#F59E0B', color: 'white' },
  2: { bg: '#9CA3AF', color: 'white' },
  3: { bg: '#B45309', color: 'white' },
}

function SkeletonItem() {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* 썸네일 */}
      <div style={{ paddingTop: '56.25%', borderRadius: 12, background: 'var(--color-muted)', position: 'relative', overflow: 'hidden' }} className="animate-pulse" />
      {/* 정보 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, borderRadius: 4, background: 'var(--color-muted)', marginBottom: 6 }} className="animate-pulse" />
          <div style={{ height: 14, borderRadius: 4, background: 'var(--color-muted)', width: '75%', marginBottom: 6 }} className="animate-pulse" />
          <div style={{ height: 11, borderRadius: 4, background: 'var(--color-muted)', width: '40%' }} className="animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '12px 12px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
        <div style={{ width: 140, height: 18, borderRadius: 6, background: 'var(--color-muted)' }} className="animate-pulse" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)}
    </div>
  )
}

export function HotPanelClient() {
  const [entries, setEntries] = useState<PanelHotEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/panels/hot')
      .then(r => r.json())
      .then((data: PanelHotEntry[]) => { setEntries(data); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') return <Skeleton />

  return (
    <div style={{ padding: '12px 12px 40px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame size={18} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>Hot 100 Better</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', margin: '2px 0 0' }}>
            좋아요를 가장 많이 받은 Better
          </p>
        </div>
      </div>

      {/* 빈 상태 */}
      {entries.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 16, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔥</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>아직 좋아요가 없어요</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            랜덤 Better에서 마음에 드는 Better에 좋아요를 눌러보세요
          </p>
        </div>
      ) : (
        <div>
          {entries.map((entry, i) => {
            const rank = i + 1
            const cat = CATEGORY_MAP[entry.category]
            const catColor = CAT_COLOR[entry.category]
            const rankStyle = RANK_STYLE[rank]

            return (
              <Link
                key={entry.id}
                href={`/battles/${entry.id}`}
                style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 20 }}
              >
                {/* 썸네일 */}
                <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageAUrl}
                      alt="A"
                      style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* VS 구분선 */}
                    <div style={{
                      position: 'relative', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 1, height: '100%', position: 'absolute', background: 'rgba(255,255,255,0.25)' }} />
                      <span style={{
                        position: 'relative', zIndex: 1,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(6px)',
                        color: 'white', fontSize: '0.55rem', fontWeight: 900,
                        padding: '3px 5px', borderRadius: 6,
                        letterSpacing: '0.04em',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}>VS</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageBUrl}
                      alt="B"
                      style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>

                  {/* 순위 배지 (좌상단) */}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    background: rankStyle ? rankStyle.bg : 'rgba(0,0,0,0.7)',
                    color: rankStyle ? rankStyle.color : 'white',
                    fontSize: rank > 9 ? '0.62rem' : '0.7rem',
                    fontWeight: 900,
                    minWidth: 24, height: 24,
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}>
                    {rank}
                  </div>

                  {/* 좋아요 수 (우하단) */}
                  <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: 6,
                    padding: '3px 7px',
                  }}>
                    <Heart size={11} style={{ fill: '#F43F5E', stroke: '#F43F5E', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'white' }}>
                      {entry.likeCount}
                    </span>
                  </div>
                </div>

                {/* 정보 영역 */}
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
                  {/* 카테고리 아이콘 */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: catColor.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    {cat.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* 제목 */}
                    <p style={{
                      margin: 0,
                      fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.4,
                      color: 'var(--color-foreground)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {entry.title}
                    </p>
                    {/* 메타 */}
                    <p style={{
                      margin: '4px 0 0',
                      fontSize: '0.75rem', color: 'var(--color-muted-foreground)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: catColor.bg, color: catColor.text,
                        padding: '1px 7px', borderRadius: 999,
                        fontSize: '0.68rem', fontWeight: 700,
                      }}>
                        {cat.label}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Heart size={10} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                        {entry.likeCount}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Link
        href="/hot"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 4, padding: '12px 0',
          borderRadius: 12, border: '1.5px solid var(--color-border)',
          fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B',
          textDecoration: 'none',
        }}
      >
        전체 Hot 100 보기 →
      </Link>
    </div>
  )
}
