'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Flame } from 'lucide-react'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'
import type { PanelHotEntry } from '@/app/api/panels/hot/route'

const CAT_BADGE: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#EFF6FF', text: '#2563EB' },
  appearance: { bg: '#FDF2F8', text: '#BE185D' },
  love:       { bg: '#FFF1F2', text: '#F43F5E' },
  shopping:   { bg: '#FFFBEB', text: '#D97706' },
  food:       { bg: '#FFF7ED', text: '#EA580C' },
  it:         { bg: '#F5F3FF', text: '#7C3AED' },
  decision:   { bg: '#F0FDF4', text: '#15803D' },
}

const HOT_RANK_COLOR = ['#D97706', '#9CA3AF', '#92400E']

function Skeleton() {
  return (
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF3C7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Flame size={20} color="#F59E0B" />
        </div>
        <div>
          <div style={{ width: 120, height: 18, borderRadius: 6, background: 'var(--color-muted)', marginBottom: 4 }} className="animate-pulse" />
          <div style={{ width: 160, height: 12, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
        </div>
      </div>
      <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < 7 ? '1px solid var(--color-border)' : undefined }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
            <div style={{ width: 72, height: 36, borderRadius: 8, background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
            <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
            <div style={{ width: 40, height: 22, borderRadius: 999, background: 'var(--color-muted)' }} className="animate-pulse" />
          </div>
        ))}
      </div>
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
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.2 }}>Hot 100 Better</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', marginTop: 2 }}>
            좋아요를 가장 많이 받은 Better
          </p>
        </div>
      </div>

      {/* 리스트 */}
      {entries.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 20, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔥</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>아직 좋아요가 없어요</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            랜덤 Better에서 마음에 드는 Better에 좋아요를 눌러보세요
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
          {entries.map((entry, i) => {
            const rank = i + 1
            const cat = CATEGORY_MAP[entry.category]
            const catStyle = CAT_BADGE[entry.category]
            return (
              <Link
                key={entry.id}
                href={`/battles/${entry.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < entries.length - 1 ? '1px solid var(--color-border)' : undefined,
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                {rank <= 3 ? (
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 900,
                    background: rank === 1 ? '#FEF3C7' : rank === 2 ? '#F3F4F6' : '#FEF3C7',
                    color: HOT_RANK_COLOR[rank - 1],
                  }}>
                    {rank}
                  </span>
                ) : (
                  <span style={{ width: 26, textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                    {rank}
                  </span>
                )}

                <div style={{ display: 'flex', overflow: 'hidden', borderRadius: 8, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.imageAUrl} alt="A" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.imageBUrl} alt="B" style={{ width: 36, height: 36, objectFit: 'cover', borderLeft: '2px solid var(--color-background)' }} />
                </div>

                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.83rem', fontWeight: 600 }}>
                  {cat.emoji} {entry.title}
                </span>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                  background: '#FFF1F2', borderRadius: 999, padding: '3px 8px',
                  border: '1px solid #FECDD3',
                }}>
                  <Heart size={11} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F43F5E' }}>
                    {entry.likeCount}
                  </span>
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
          marginTop: 16, padding: '12px 0',
          borderRadius: 16, border: '1.5px solid var(--color-border)',
          fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B',
          textDecoration: 'none',
        }}
      >
        전체 Hot 100 보기 →
      </Link>
    </div>
  )
}
