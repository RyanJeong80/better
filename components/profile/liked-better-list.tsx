'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'
import type { LikedBattle } from '@/app/api/user/profile/liked/route'

const CAT_BADGE: Record<string, { bg: string; text: string }> = {
  fashion:    { bg: '#EFF6FF', text: '#2563EB' },
  appearance: { bg: '#FDF2F8', text: '#BE185D' },
  love:       { bg: '#FFF1F2', text: '#F43F5E' },
  shopping:   { bg: '#FFFBEB', text: '#D97706' },
  food:       { bg: '#FFF7ED', text: '#EA580C' },
  it:         { bg: '#F5F3FF', text: '#7C3AED' },
  decision:   { bg: '#F0FDF4', text: '#15803D' },
}

function PhotoCell({
  imageUrl, isTextOnly, sideText, id, side, isMyChoice,
}: {
  imageUrl: string
  isTextOnly: boolean
  sideText: string | null
  id: string
  side: 'A' | 'B'
  isMyChoice: boolean
}) {
  const colorOffset = side === 'A' ? 0 : 1
  return (
    <div style={{
      position: 'relative', paddingTop: '100%', overflow: 'hidden', background: '#111',
      border: isMyChoice ? '2.5px solid #3D2B1F' : '2.5px solid transparent',
      borderRadius: 2, boxSizing: 'border-box',
    }}>
      {isTextOnly ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: TEXT_BG_COLORS[getTextColorIdx(id, colorOffset)].bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10,
        }}>
          <p style={{
            color: TEXT_BG_COLORS[getTextColorIdx(id, colorOffset)].text,
            fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 5, WebkitBoxOrient: 'vertical',
          }}>
            {sideText}
          </p>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl} alt={`사진 ${side}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <div style={{
        position: 'absolute', top: 6, left: 6,
        background: side === 'A' ? '#3D2B1F' : '#D4C4B0',
        color: side === 'A' ? 'white' : '#3D2B1F',
        fontSize: '0.62rem', fontWeight: 900, padding: '2px 7px', borderRadius: 4,
      }}>
        {side}
      </div>
      {isMyChoice && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: '#3D2B1F', color: 'white',
          fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: 4,
        }}>
          ✓
        </div>
      )}
    </div>
  )
}

function LikedBattleCard({ battle }: { battle: LikedBattle }) {
  const t = useTranslations()
  const cat = CATEGORY_MAP[battle.category]
  const catStyle = CAT_BADGE[battle.category] ?? { bg: '#F3F4F6', text: '#374151' }

  const total = battle.total
  const pctA = total > 0 ? Math.round((battle.votesA / total) * 100) : 0
  const pctB = total > 0 ? 100 - pctA : 0

  const hasWinner = battle.winner !== null
  const voted = battle.myChoice !== null

  let resultLabel = ''
  let resultColor = '#9CA3AF'
  if (voted && hasWinner) {
    if (battle.winner === battle.myChoice) {
      resultLabel = `✓ ${t('profile.votedHit')}`
      resultColor = '#16A34A'
    } else if (battle.votesA === battle.votesB) {
      resultLabel = `= ${t('profile.votedTie')}`
      resultColor = '#6B7280'
    } else {
      resultLabel = `✗ ${t('profile.votedMiss')}`
      resultColor = '#DC2626'
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 4,
        boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
        overflow: 'hidden',
      }}>
        {/* 이미지 */}
        <div style={{ padding: '6px 6px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <PhotoCell
              imageUrl={battle.imageAUrl}
              isTextOnly={battle.isTextOnly}
              sideText={battle.imageAText}
              id={battle.id}
              side="A"
              isMyChoice={battle.myChoice === 'A'}
            />
            <PhotoCell
              imageUrl={battle.imageBUrl}
              isTextOnly={battle.isTextOnly}
              sideText={battle.imageBText}
              id={battle.id}
              side="B"
              isMyChoice={battle.myChoice === 'B'}
            />
          </div>
        </div>

        {/* 정보 */}
        <div style={{ padding: '10px 10px 14px' }}>
          {/* 카테고리 + 작성자 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: catStyle.bg, color: catStyle.text,
              borderRadius: 4, padding: '2px 7px',
              fontSize: '0.73rem', fontWeight: 700,
            }}>
              {cat.emoji} {cat.label}
            </span>
            {battle.authorName && (
              <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>@{battle.authorName}</span>
            )}
          </div>

          {/* 제목 */}
          <h3 style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4, color: '#3D2B1F' }}>
            {battle.title}
          </h3>

          {/* 좋아요 배지 + 내 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: '#FFF1F2', color: '#F43F5E',
              borderRadius: 4, padding: '2px 7px',
              fontSize: '0.72rem', fontWeight: 700,
            }}>
              ❤️ {t('profile.likedTouchesTab')}
            </span>
            {voted && (
              <>
                <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>
                  {t('vote.myChoice')}
                </span>
                <span style={{
                  borderRadius: 4, padding: '1px 8px',
                  fontSize: '0.72rem', fontWeight: 900,
                  background: '#3D2B1F', color: 'white',
                }}>
                  {battle.myChoice}
                </span>
                {resultLabel && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: resultColor, marginLeft: 'auto' }}>
                    {resultLabel}
                  </span>
                )}
              </>
            )}
          </div>

          {/* 투표 현황 바 */}
          {total > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: battle.myChoice === 'A' ? '#3D2B1F' : '#9CA3AF' }}>
                  A {pctA}%
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: battle.myChoice === 'B' ? '#3D2B1F' : '#9CA3AF' }}>
                  B {pctB}%
                </span>
              </div>
              <div style={{ height: 5, width: '100%', borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pctA}%`, borderRadius: 999,
                  background: 'linear-gradient(90deg, #3D2B1F, #7C6152)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'center' }}>
                {t('vote.totalVotes', { count: total })}
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>
              {t('profile.votedCounting')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function LikedBetterList() {
  const t = useTranslations()
  const [battles, setBattles] = useState<LikedBattle[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    fetch('/api/user/profile/liked')
      .then(r => r.json())
      .then((data: LikedBattle[]) => {
        setBattles(data)
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ height: 280, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted-foreground)' }}>
        <p>{t('common.error')}</p>
      </div>
    )
  }

  if (battles.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: 24, border: '1.5px dashed var(--color-border)', padding: '80px 0', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>❤️</div>
        <p style={{ fontWeight: 700 }}>{t('profile.noLikedYet')}</p>
        <p style={{ marginTop: 4, fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
          {t('profile.noLikedDesc')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {battles.map(battle => (
        <LikedBattleCard key={battle.id} battle={battle} />
      ))}
    </div>
  )
}
