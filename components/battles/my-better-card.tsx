'use client'

import { useState } from 'react'
import { ChevronDown, Heart, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { BetterCategory } from '@/lib/constants/categories'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'

interface Reason {
  choice: 'A' | 'B'
  reason: string
}

interface BattleStats {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
  votesA: number
  votesB: number
  total: number
  reasons: Reason[]
  createdAt: Date
  closedAt: Date | null
  winner: 'A' | 'B' | null
  likesCount: number
  category: BetterCategory
}

const CAT_BADGE: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#EFF6FF', text: '#2563EB' },
  appearance: { bg: '#FDF2F8', text: '#BE185D' },
  love:       { bg: '#FFF1F2', text: '#F43F5E' },
  shopping:   { bg: '#FFFBEB', text: '#D97706' },
  food:       { bg: '#FFF7ED', text: '#EA580C' },
  it:         { bg: '#F5F3FF', text: '#7C3AED' },
  decision:   { bg: '#F0FDF4', text: '#15803D' },
}

function getDeadlineBadge(closedAt: Date | null, winner: 'A' | 'B' | null) {
  if (!closedAt) return null
  const diff = closedAt.getTime() - Date.now()

  if (diff <= 0) {
    const result = winner ? `결과: ${winner}승` : '동률'
    return { text: `마감 · ${result}`, color: '#9CA3AF', bg: '#F3F4F6' }
  }

  const hours = diff / (1000 * 60 * 60)
  if (hours < 24) {
    const h = Math.ceil(hours)
    return { text: `${h}시간 남음`, color: '#EF4444', bg: '#FEF2F2' }
  }
  const days = Math.ceil(hours / 24)
  return { text: `${days}일 남음`, color: '#6B7280', bg: '#F3F4F6' }
}

function ImageResult({
  imageUrl, description, votes, total, pct, side, isWinner, id, isTextOnly, sideText,
}: {
  imageUrl: string
  description: string | null
  votes: number
  total: number
  pct: number
  side: 'A' | 'B'
  isWinner: boolean
  id: string
  isTextOnly?: boolean
  sideText?: string | null
}) {
  const colorOffset = side === 'A' ? 0 : 1
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderLeft: side === 'B' ? '1px solid var(--color-border)' : undefined }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', overflow: 'hidden' }}>
        {isTextOnly ? (
          <div style={{
            position: 'absolute', inset: 0,
            background: TEXT_BG_COLORS[getTextColorIdx(id, colorOffset)].bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
          }}>
            <p style={{
              color: TEXT_BG_COLORS[getTextColorIdx(id, colorOffset)].text,
              fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', lineHeight: 1.4,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 5, WebkitBoxOrient: 'vertical',
            }}>
              {sideText}
            </p>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={`사진 ${side}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {total > 0 ? (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 55%, transparent 80%)',
            }} />
            {isWinner && (
              <div style={{
                position: 'absolute', top: 8, right: 8, zIndex: 3,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white', fontSize: '0.65rem', fontWeight: 800,
                padding: '3px 10px', borderRadius: 999,
              }}>
                우세
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, padding: '10px' }}>
              <p style={{ color: 'white', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>
                {pct}%
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', marginTop: 2 }}>
                {votes}명
              </p>
              <div style={{ marginTop: 6, height: 3, width: '100%', borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 999,
                  background: 'linear-gradient(90deg, #818CF8, #A78BFA)',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
          </>
        ) : (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 10,
            background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>아직 투표 없음</p>
          </div>
        )}
      </div>

      {description && (
        <p style={{ borderTop: '1px solid var(--color-border)', padding: '8px 12px', fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--color-muted-foreground)', margin: 0 }}>
          {description}
        </p>
      )}
    </div>
  )
}

export function MyBetterCard({
  battle,
  onDeleteClick,
}: {
  battle: BattleStats
  onDeleteClick: (id: string) => void
}) {
  const [showReasons, setShowReasons] = useState(false)
  const t = useTranslations()

  const pctA = battle.total > 0 ? Math.round((battle.votesA / battle.total) * 100) : 0
  const pctB = battle.total > 0 ? 100 - pctA : 0
  const aWins = battle.votesA > battle.votesB
  const bWins = battle.votesB > battle.votesA
  const deadline = getDeadlineBadge(battle.closedAt, battle.winner)

  const cat = CATEGORY_MAP[battle.category]
  const catStyle = CAT_BADGE[battle.category]

  return (
    <div style={{ overflow: 'hidden', borderRadius: 24, border: '1px solid var(--color-border)', background: 'var(--color-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 16px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                borderRadius: 999, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600,
                background: catStyle.bg, color: catStyle.text,
              }}
            >
              {cat.emoji} {cat.label}
            </span>
            {deadline && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '0.68rem', fontWeight: 700,
                color: deadline.color, background: deadline.bg,
                padding: '2px 8px', borderRadius: 999,
              }}>
                {deadline.text}
              </span>
            )}
          </div>
          <h3 style={{ fontWeight: 700, lineHeight: 1.3, color: 'var(--color-foreground)', margin: 0 }}>{battle.title}</h3>
          <p style={{ marginTop: 2, fontSize: '0.75rem', color: 'var(--color-muted-foreground)', margin: '2px 0 0' }}>
            {battle.total > 0 ? `총 ${battle.total}표` : '아직 투표가 없어요'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {battle.likesCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              borderRadius: 999, border: '1px solid #FFE4E6', background: '#FFF1F2',
              padding: '4px 10px',
            }}>
              <Heart size={12} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F43F5E', fontVariantNumeric: 'tabular-nums' }}>{battle.likesCount}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteClick(battle.id) }}
            style={{
              width: 32, height: 32, borderRadius: 10,
              border: '1.5px solid var(--color-border)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-muted-foreground)',
            }}
            aria-label={t('better.deleteTitle')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 이미지 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)' }}>
        <ImageResult
          imageUrl={battle.imageAUrl}
          description={battle.imageADescription}
          votes={battle.votesA}
          total={battle.total}
          pct={pctA}
          side="A"
          isWinner={aWins}
          id={battle.id}
          isTextOnly={battle.isTextOnly}
          sideText={battle.imageAText}
        />
        <ImageResult
          imageUrl={battle.imageBUrl}
          description={battle.imageBDescription}
          votes={battle.votesB}
          total={battle.total}
          pct={pctB}
          side="B"
          isWinner={bWins}
          id={battle.id}
          isTextOnly={battle.isTextOnly}
          sideText={battle.imageBText}
        />
      </div>

      {/* 이유 보기 */}
      {battle.reasons.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setShowReasons((v) => !v)}
            style={{
              display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ color: 'var(--color-muted-foreground)' }}>이유 보기</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                borderRadius: 999, background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--color-primary)',
              }}>
                {battle.reasons.length}
              </span>
              <ChevronDown
                size={15}
                style={{
                  color: 'var(--color-muted-foreground)',
                  transform: showReasons ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </div>
          </button>

          {showReasons && (
            <ul style={{ borderTop: '1px solid var(--color-border)', margin: 0, padding: 0, listStyle: 'none' }}>
              {battle.reasons.map((r, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                }}>
                  <span style={{
                    flexShrink: 0, borderRadius: 999, padding: '2px 10px',
                    fontSize: '0.75rem', fontWeight: 700, marginTop: 2,
                    background: r.choice === 'A' ? '#E0E7FF' : '#EDE9FE',
                    color: r.choice === 'A' ? '#4338CA' : '#7C3AED',
                  }}>
                    {r.choice}
                  </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground)', opacity: 0.8, margin: 0 }}>{r.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
