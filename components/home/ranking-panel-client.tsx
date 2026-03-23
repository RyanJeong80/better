'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { PanelRankEntry, PanelRankResponse } from '@/app/api/panels/ranking/route'

const TABS = [
  { key: 'all',        label: '전체',  emoji: '' },
  { key: 'fashion',    label: '패션',  emoji: '👗' },
  { key: 'appearance', label: '외모',  emoji: '💄' },
  { key: 'love',       label: '연애',  emoji: '💕' },
  { key: 'shopping',   label: '쇼핑',  emoji: '💰' },
  { key: 'food',       label: '맛집',  emoji: '🍽️' },
  { key: 'it',         label: 'IT',    emoji: '📱' },
  { key: 'decision',   label: '결정',  emoji: '🤔' },
] as const

type TabKey = typeof TABS[number]['key']

const RANK_COLOR = ['#D97706', '#6B7280', '#92400E']

function Skeleton() {
  return (
    <div style={{ padding: '12px 12px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F3FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={20} color="#8B5CF6" />
        </div>
        <div>
          <div style={{ width: 100, height: 18, borderRadius: 6, background: 'var(--color-muted)', marginBottom: 4 }} className="animate-pulse" />
          <div style={{ width: 140, height: 12, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
        </div>
      </div>
      {/* 탭 스켈레톤 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[60, 44, 44, 44, 44].map((w, i) => (
          <div key={i} style={{ width: w, height: 30, borderRadius: 999, background: 'var(--color-muted)' }} className="animate-pulse" />
        ))}
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
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [data, setData] = useState<PanelRankResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/panels/ranking?category=${activeTab}`)
      .then(r => r.json())
      .then((d: PanelRankResponse) => {
        console.log('[RankingPanel] response:', d)
        setData(d)
        setStatus('done')
      })
      .catch((e) => { console.error('[RankingPanel] error:', e); setStatus('error') })
  }, [activeTab])

  if (status === 'loading' && !data) return <Skeleton />

  const entries: PanelRankEntry[] = data?.entries ?? []
  const myEntry = data?.myEntry ?? null
  const isCategoryMode = activeTab !== 'all'
  const tab = TABS.find(t => t.key === activeTab)!

  return (
    <div style={{ padding: '12px 12px 40px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>Better 랭킹</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', marginTop: 2 }}>
            {isCategoryMode ? `${tab.emoji} ${tab.label} 적중률 TOP 30` : '참여 횟수 TOP 30'}
          </p>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div
        ref={tabsRef}
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4, marginBottom: 14,
          scrollbarWidth: 'none',
          touchAction: 'pan-x',
        }}
      >
        {TABS.map(t => {
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 999,
                border: active ? 'none' : '1.5px solid var(--color-border)',
                background: active ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'transparent',
                color: active ? 'white' : 'var(--color-muted-foreground)',
                fontSize: '0.75rem', fontWeight: active ? 800 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {t.emoji ? `${t.emoji} ${t.label}` : t.label}
            </button>
          )
        })}
      </div>

      {/* 내 랭킹 카드 */}
      {myEntry !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', marginBottom: 14, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
          border: '1.5px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 900, color: 'white',
          }}>
            나
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700 }}>내 랭킹</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--color-muted-foreground)' }}>
              {isCategoryMode
                ? myEntry.accuracy !== null
                  ? `${tab.emoji} ${tab.label} 적중률 ${myEntry.accuracy}% · 참여 ${myEntry.participated}건`
                  : `${tab.emoji} ${tab.label} 판정된 투표 없음 · 참여 ${myEntry.participated}건`
                : `참여 ${myEntry.participated}건`}
            </p>
          </div>
          {myEntry.rank !== null ? (
            <span style={{
              fontSize: '1rem', fontWeight: 900, color: '#6366F1',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {myEntry.rank}위
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)' }}>
              {myEntry.participated === 0 ? '미참여' : '30위 밖'}
            </span>
          )}
        </div>
      )}

      {/* 리스트 */}
      {status === 'loading' ? (
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < 5 ? '1px solid var(--color-border)' : undefined }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
              <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
              <div style={{ width: 40, height: 14, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 20, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>
            {isCategoryMode ? `${tab.emoji} ${tab.label} 랭킹 데이터 없음` : '아직 데이터가 없어요'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            {isCategoryMode ? '이 카테고리에서 투표하면 랭킹에 반영돼요' : '투표에 참여하면 여기에 나타납니다'}
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
                {isCategoryMode ? (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6366F1', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.accuracy}%
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-muted-foreground)', marginLeft: 4 }}>
                      {entry.participated}건
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6366F1', fontVariantNumeric: 'tabular-nums' }}>
                    {entry.participated}건
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Link
        href={`/ranking${isCategoryMode ? `?category=${activeTab}` : ''}`}
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
