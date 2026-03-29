'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { X, Trophy } from 'lucide-react'
import { calcLevel } from '@/lib/level'
import { LevelBadge } from '@/components/ui/level-badge'
import { UserProfileModal } from '@/components/ui/user-profile-modal'
import { countryToFlag } from '@/lib/utils/country'
import type { PanelRankEntry, PanelRankResponse } from '@/app/api/panels/ranking/route'

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

export function RankingFullModal({
  initialTab = 'all',
  viewerUserId,
  onClose,
}: {
  initialTab?: TabKey
  viewerUserId?: string | null
  onClose: () => void
}) {
  const t = useTranslations()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [data, setData] = useState<PanelRankResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/panels/ranking?category=${activeTab}`)
      .then(r => r.json())
      .then((d: PanelRankResponse) => { setData(d); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [activeTab])

  if (!mounted) return null

  const entries: PanelRankEntry[] = data?.entries ?? []
  const myEntry = data?.myEntry ?? null
  const isCategoryMode = activeTab !== 'all'
  const activeTabInfo = TAB_KEYS.find(t => t.key === activeTab)!

  const tabLabel = (key: TabKey) =>
    key === 'all' ? t('categories.all') : t(`categories.${key}Short` as Parameters<typeof t>[0])
  const tabEmoji = (key: TabKey) => TAB_KEYS.find(t => t.key === key)?.emoji ?? ''

  const modal = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        backgroundColor: '#EDE4DA', zIndex: 9999,
        overflowY: 'auto', overscrollBehavior: 'contain',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: '#EDE4DA',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy size={18} color="white" />
        </div>
        <h1 style={{ flex: 1, fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>
          {t('ranking.title')}
        </h1>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-foreground)' }}
        >
          <X size={22} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px 60px' }}>
        {/* 카테고리 탭 */}
        <div
          ref={tabsRef}
          style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            paddingBottom: 4, marginBottom: 14,
            scrollbarWidth: 'none',
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
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < 9 ? '1px solid var(--color-border)' : undefined }}>
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
                  onClick={() => setProfileModalUserId(entry.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px',
                    borderBottom: i < entries.length - 1 ? '1px solid var(--color-border)' : undefined,
                    cursor: 'pointer',
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
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '1.125rem', fontWeight: 600 }}>
                    {entry.name}
                  </span>
                  {entry.country && (
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{countryToFlag(entry.country)}</span>
                  )}
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
      </div>

      {profileModalUserId && (
        <UserProfileModal
          userId={profileModalUserId}
          viewerUserId={viewerUserId}
          onClose={() => setProfileModalUserId(null)}
        />
      )}
    </div>
  )

  return createPortal(modal, document.body)
}
