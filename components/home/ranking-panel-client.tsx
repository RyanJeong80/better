'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Trophy } from 'lucide-react'
import { calcLevel } from '@/lib/level'
import { LevelBadge } from '@/components/ui/level-badge'
import type { PanelRankEntry, PanelRankResponse } from '@/app/api/panels/ranking/route'
import { countryToFlag } from '@/lib/utils/country'

type TabKey = 'all' | 'fashion' | 'appearance' | 'love' | 'shopping' | 'food' | 'it' | 'decision'

const TAB_KEYS: { key: TabKey; emoji: string }[] = [
  { key: 'all',        emoji: '' },
  { key: 'fashion',    emoji: '👗' },
  { key: 'appearance', emoji: '💄' },
  { key: 'love',       emoji: '💕' },
  { key: 'shopping',   emoji: '💰' },
  { key: 'food',       emoji: '🍽️' },
  { key: 'it',         emoji: '📱' },
  { key: 'decision',   emoji: '🤔' },
]

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
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [data, setData] = useState<PanelRankResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/panels/ranking?category=${activeTab}`)
      .then(r => r.json())
      .then((d: PanelRankResponse) => { setData(d); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [activeTab])

  if (status === 'loading' && !data) return <Skeleton />

  const entries: PanelRankEntry[] = data?.entries ?? []
  const myEntry = data?.myEntry ?? null
  const isCategoryMode = activeTab !== 'all'
  const activeTabInfo = TAB_KEYS.find(t => t.key === activeTab)!

  const tabLabel = (key: TabKey) =>
    key === 'all' ? t('categories.all') : t(`categories.${key}Short` as Parameters<typeof t>[0])
  const tabEmoji = (key: TabKey) => TAB_KEYS.find(t => t.key === key)?.emoji ?? ''

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>{t('ranking.title')}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', marginTop: 2 }}>
            {isCategoryMode
              ? t('ranking.topAccuracy', { emoji: activeTabInfo.emoji, label: tabLabel(activeTab) })
              : t('ranking.topParticipation')}
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
        {TAB_KEYS.map(({ key, emoji }) => {
          const active = activeTab === key
          const label = tabLabel(key)
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 999,
                border: 'none',
                background: active ? '#3D2B1F' : '#D4C4B0',
                color: active ? '#ffffff' : '#3D2B1F',
                fontSize: '1rem', fontWeight: active ? 800 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {emoji ? `${emoji} ${label}` : label}
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
            fontSize: '0.875rem', fontWeight: 900, color: 'white',
          }}>
            {t('vote.me')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{t('ranking.myRanking')}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
              {isCategoryMode
                ? myEntry.accuracy !== null
                  ? t('ranking.myAccuracyStats', { emoji: activeTabInfo.emoji, label: tabLabel(activeTab), accuracy: myEntry.accuracy, count: myEntry.participated })
                  : t('ranking.noJudgedVotes', { emoji: activeTabInfo.emoji, label: tabLabel(activeTab), count: myEntry.participated })
                : t('ranking.myStats', { count: myEntry.participated })}
            </p>
          </div>
          {myEntry.rank !== null ? (
            <span style={{
              fontSize: '1.125rem', fontWeight: 900, color: '#6366F1',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {t('ranking.rank', { n: myEntry.rank })}
            </span>
          ) : (
            <span style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
              {myEntry.participated === 0 ? t('ranking.notParticipated') : t('ranking.outOfTop30')}
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
            {isCategoryMode
              ? t('ranking.categoryNoData', { emoji: tabEmoji(activeTab), label: tabLabel(activeTab) })
              : t('ranking.noData')}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            {isCategoryMode ? t('ranking.categoryVoteToAppear') : t('ranking.voteToAppear')}
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
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 900,
                    background: rank === 1 ? '#FEF3C7' : rank === 2 ? '#F3F4F6' : '#FEF3C7',
                    color: RANK_COLOR[rank - 1],
                  }}>
                    {rank}
                  </span>
                ) : (
                  <span style={{ width: 24, textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                    {rank}
                  </span>
                )}
                {/* Avatar */}
                {entry.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={entry.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 900, color: 'white',
                  }}>
                    {(entry.name?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                {/* Country flag */}
                {entry.country && (
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{countryToFlag(entry.country)}</span>
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '1.125rem', fontWeight: 600 }}>
                  {entry.name}
                </span>
                <LevelBadge level={calcLevel(entry.participated, entry.accuracy)} size="xs" showName={false} />
                {isCategoryMode ? (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#6366F1', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.accuracy}%
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', marginLeft: 4 }}>
                      {entry.participated}{t('ranking.countUnit')}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#6366F1', fontVariantNumeric: 'tabular-nums' }}>
                    {entry.participated}{t('ranking.countUnit')}
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
          borderRadius: 16, border: 'none',
          background: '#3D2B1F',
          fontSize: '1rem', fontWeight: 700, color: '#ffffff',
          textDecoration: 'none',
        }}
      >
        {t('ranking.viewAll')}
      </Link>
    </div>
  )
}
