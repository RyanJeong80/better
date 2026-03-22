'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { PanelRankEntry } from '@/app/api/panels/ranking/route'

const RANK_COLOR = ['#D97706', '#9CA3AF', '#92400E']

function Skeleton() {
  return (
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F3FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={20} color="#8B5CF6" />
        </div>
        <div>
          <div style={{ width: 100, height: 18, borderRadius: 6, background: 'var(--color-muted)', marginBottom: 4 }} className="animate-pulse" />
          <div style={{ width: 140, height: 12, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
        </div>
      </div>
      <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < 7 ? '1px solid var(--color-border)' : undefined }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
            <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
            <div style={{ width: 36, height: 14, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RankingPanelClient() {
  const [entries, setEntries] = useState<PanelRankEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/panels/ranking')
      .then(r => r.json())
      .then((data: PanelRankEntry[]) => { setEntries(data); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') return <Skeleton />

  return (
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.2 }}>Better 랭킹</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', marginTop: 2 }}>
            참여 횟수 TOP 30
          </p>
        </div>
      </div>

      {/* 리스트 */}
      {entries.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 20, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>아직 데이터가 없어요</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            투표에 참여하면 여기에 나타납니다
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
          {entries.map((entry, i) => {
            const rank = i + 1
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px',
                  borderBottom: i < entries.length - 1 ? '1px solid var(--color-border)' : undefined,
                }}
              >
                {rank <= 3 ? (
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 900,
                    background: rank === 1 ? '#FEF3C7' : rank === 2 ? '#F3F4F6' : '#FEF3C7',
                    color: RANK_COLOR[rank - 1],
                  }}>
                    {rank}
                  </span>
                ) : (
                  <span style={{ width: 28, textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                    {rank}
                  </span>
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.88rem', fontWeight: 600 }}>
                  {entry.name}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6366F1', fontVariantNumeric: 'tabular-nums' }}>
                  {entry.participated}건
                </span>
              </div>
            )
          })}
        </div>
      )}

      <Link
        href="/ranking"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 16, padding: '12px 0',
          borderRadius: 16, border: '1.5px solid var(--color-border)',
          fontSize: '0.85rem', fontWeight: 700, color: '#6366F1',
          textDecoration: 'none',
        }}
      >
        전체 랭킹 보기 →
      </Link>
    </div>
  )
}
