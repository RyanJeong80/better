'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Trash2, X } from 'lucide-react'
import { ShareButton } from './share-button'
import { useTranslations } from 'next-intl'
import type { BetterCategory } from '@/lib/constants/categories'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'
import { countryToFlag } from '@/lib/utils/country'
import { UserProfileModal } from '@/components/ui/user-profile-modal'
import { UserTouchesModal } from '@/components/ui/user-touches-modal'

interface Reason {
  choice: 'A' | 'B'
  reason: string
  voterId: string | null
  voterName: string | null
  voterAvatarUrl: string | null
  voterCountry: string | null
}

interface BattleStats {
  id: string
  title: string
  description?: string | null
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

function ImageCell({
  imageUrl, votes, total, pct, side, isWinner, id, isTextOnly, sideText,
}: {
  imageUrl: string
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
    <div style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden', background: '#111' }}>
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
          src={imageUrl}
          alt={`사진 ${side}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Side label */}
      <div style={{
        position: 'absolute', top: 7, left: 7,
        background: side === 'A' ? '#3D2B1F' : '#D4C4B0',
        color: side === 'A' ? 'white' : '#3D2B1F',
        fontSize: '0.62rem', fontWeight: 900, padding: '2px 7px', borderRadius: 4,
      }}>
        {side}
      </div>

      {total > 0 ? (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.08) 55%, transparent 80%)',
          }} />
          {isWinner && (
            <div style={{
              position: 'absolute', top: 7, right: 7,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontSize: '0.58rem', fontWeight: 800,
              padding: '2px 7px', borderRadius: 4,
            }}>
              우세
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 8px 9px' }}>
            <p style={{ color: 'white', fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>{pct}%</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', marginTop: 1 }}>{votes}명</p>
            <div style={{ marginTop: 4, height: 2, width: '100%', borderRadius: 999, background: 'rgba(255,255,255,0.25)' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'linear-gradient(90deg, #818CF8, #A78BFA)' }} />
            </div>
          </div>
        </>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 8px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 60%)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.62rem', margin: 0 }}>아직 투표 없음</p>
        </div>
      )}
    </div>
  )
}

function ReasonsSheet({
  reasons, onClose, t,
}: {
  reasons: Reason[]
  onClose: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const [tab, setTab] = useState<'A' | 'B' | 'all'>('all')
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null)
  const [touchesModalUserId, setTouchesModalUserId] = useState<string | null>(null)
  const aCount = reasons.filter(r => r.choice === 'A').length
  const bCount = reasons.filter(r => r.choice === 'B').length
  const filtered = tab === 'all' ? reasons : reasons.filter(r => r.choice === tab)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
      <div
        style={{
          position: 'relative', background: '#ffffff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '72vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#D4C4B0' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 10px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#3D2B1F' }}>
            {t('better.allReasons', { count: reasons.length })}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF', display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* A / B / 전체 탭 */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', borderBottom: '1px solid #F0E8DE' }}>
          {(['all', 'A', 'B'] as const).map(key => {
            const cnt = key === 'all' ? reasons.length : key === 'A' ? aCount : bCount
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: active ? '#3D2B1F' : '#F0E8DE',
                  color: active ? 'white' : '#3D2B1F',
                  fontSize: '0.78rem', fontWeight: 700,
                }}
              >
                {key === 'all' ? `전체 ${cnt}` : `${key} ${cnt}`}
              </button>
            )
          })}
        </div>

        {/* 이유 목록 */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }} onClick={e => e.stopPropagation()}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '32px 16px', color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>
              이유가 없어요
            </p>
          ) : (
            filtered.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 16px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #F5EFE8' : undefined,
                }}
              >
                {/* Voter avatar — clickable if we have a userId */}
                <button
                  onClick={() => r.voterId && setProfileModalUserId(r.voterId)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: r.voterId ? 'pointer' : 'default', flexShrink: 0 }}
                >
                  {r.voterAvatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.voterAvatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 900, color: 'white',
                    }}>
                      {(r.voterName?.[0] ?? '?').toUpperCase()}
                    </span>
                  )}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    onClick={() => r.voterId && setProfileModalUserId(r.voterId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, background: 'none', border: 'none', padding: 0, cursor: r.voterId ? 'pointer' : 'default' }}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3D2B1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.voterName ?? '익명'}
                    </span>
                    {r.voterCountry && <span style={{ fontSize: '0.8rem' }}>{countryToFlag(r.voterCountry)}</span>}
                    <span style={{
                      flexShrink: 0, borderRadius: 4, padding: '1px 7px',
                      fontSize: '0.62rem', fontWeight: 800,
                      background: r.choice === 'A' ? '#3D2B1F' : '#D4C4B0',
                      color: r.choice === 'A' ? 'white' : '#3D2B1F',
                    }}>
                      {r.choice}
                    </span>
                  </button>
                  <p style={{ fontSize: '0.875rem', color: '#3D2B1F', opacity: 0.82, margin: 0, lineHeight: 1.55 }}>
                    {r.reason}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {profileModalUserId && (
        <UserProfileModal
          userId={profileModalUserId}
          onClose={() => setProfileModalUserId(null)}
          onViewTouches={(id) => setTouchesModalUserId(id)}
        />
      )}
      {touchesModalUserId && (
        <UserTouchesModal
          userId={touchesModalUserId}
          onClose={() => setTouchesModalUserId(null)}
        />
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
  const [showSheet, setShowSheet] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null)
  const [touchesModalUserId, setTouchesModalUserId] = useState<string | null>(null)
  const t = useTranslations()

  useEffect(() => setMounted(true), [])

  const pctA = battle.total > 0 ? Math.round((battle.votesA / battle.total) * 100) : 0
  const pctB = battle.total > 0 ? 100 - pctA : 0
  const aWins = battle.votesA > battle.votesB
  const bWins = battle.votesB > battle.votesA

  const cat = CATEGORY_MAP[battle.category]
  const catStyle = CAT_BADGE[battle.category]
  const previewReasons = battle.reasons.slice(0, 3)
  const extraCount = battle.reasons.length - 3

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 폴라로이드 카드 */}
      <div style={{
        background: '#ffffff',
        borderRadius: 4,
        boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
        overflow: 'hidden',
      }}>
        {/* 이미지 영역 — 6px 좌우/상단 패딩 */}
        <div style={{ padding: '6px 6px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <ImageCell
              imageUrl={battle.imageAUrl}
              votes={battle.votesA}
              total={battle.total}
              pct={pctA}
              side="A"
              isWinner={aWins}
              id={battle.id}
              isTextOnly={battle.isTextOnly}
              sideText={battle.imageAText}
            />
            <ImageCell
              imageUrl={battle.imageBUrl}
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
        </div>

        {/* 폴라로이드 하단 정보 영역 */}
        <div style={{ padding: '10px 10px 14px' }}>
          {/* 카테고리 배지 */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: catStyle.bg, color: catStyle.text,
            borderRadius: 4, padding: '2px 7px',
            fontSize: '0.73rem', fontWeight: 700,
          }}>
            {cat.emoji} {cat.label}
          </span>

          {/* 제목 */}
          <h3 style={{ margin: '6px 0 4px', fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.4, color: '#3D2B1F' }}>
            {battle.title}
          </h3>
          {battle.description && (
            <p style={{
              margin: '0 0 6px', fontSize: '12px', color: '#666666',
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              lineHeight: '1.4',
            }}>
              {battle.description}
            </p>
          )}

          {/* 통계 + 액션 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>
                {battle.total > 0 ? `총 ${battle.total}표` : '아직 투표 없음'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Heart size={10} style={{ fill: battle.likesCount > 0 ? '#F43F5E' : 'none', stroke: '#F43F5E' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F43F5E' }}>
                  {battle.likesCount}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShareButton
                variant="icon"
                battleId={battle.id}
                title={battle.title}
                imageAUrl={battle.imageAUrl}
                imageBUrl={battle.imageBUrl}
                pctA={pctA}
                pctB={pctB}
                total={battle.total}
                winner={aWins ? 'A' : bWins ? 'B' : null}
                isTextOnly={battle.isTextOnly}
                imageAText={battle.imageAText}
                imageBText={battle.imageBText}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteClick(battle.id) }}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  border: '1.5px solid #E5E7EB',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#9CA3AF',
                }}
                aria-label={t('better.deleteTitle')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 이유 미리보기 영역 */}
      {battle.reasons.length > 0 && (
        <div style={{
          background: '#F5EFE8',
          borderTop: '1px solid #D4C4B0',
          borderRadius: '0 0 4px 4px',
          padding: '10px 12px 12px',
        }}>
          {previewReasons.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                marginBottom: i < previewReasons.length - 1 ? 10 : 0,
              }}
            >
              {/* 투표자 아바타 */}
              <button
                onClick={() => r.voterId && setProfileModalUserId(r.voterId)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: r.voterId ? 'pointer' : 'default', flexShrink: 0 }}
              >
                {r.voterAvatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={r.voterAvatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 900, color: 'white',
                  }}>
                    {(r.voterName?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 투표자 정보 행 */}
                <button
                  onClick={() => r.voterId && setProfileModalUserId(r.voterId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, background: 'none', border: 'none', padding: 0, cursor: r.voterId ? 'pointer' : 'default' }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#5C4A3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.voterName ?? '익명'}
                  </span>
                  {r.voterCountry && <span style={{ fontSize: '0.78rem' }}>{countryToFlag(r.voterCountry)}</span>}
                  <span style={{
                    flexShrink: 0, borderRadius: 4, padding: '1px 6px',
                    fontSize: '0.66rem', fontWeight: 800,
                    background: r.choice === 'A' ? '#3D2B1F' : '#D4C4B0',
                    color: r.choice === 'A' ? 'white' : '#3D2B1F',
                  }}>
                    {r.choice}
                  </span>
                </button>
                <p style={{
                  margin: 0, fontSize: '0.86rem', color: '#5C4A3A', lineHeight: 1.5,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {r.reason}
                </p>
              </div>
            </div>
          ))}
          {extraCount > 0 && (
            <button
              onClick={() => setShowSheet(true)}
              style={{
                marginTop: 10, width: '100%', padding: '7px 0',
                background: '#EDE4DA', border: 'none', borderRadius: 6,
                fontSize: '0.75rem', fontWeight: 700, color: '#3D2B1F',
                cursor: 'pointer',
              }}
            >
              {t('better.showMore', { count: extraCount })}
            </button>
          )}
        </div>
      )}

      {/* 전체 이유 바텀시트 */}
      {mounted && showSheet && createPortal(
        <ReasonsSheet reasons={battle.reasons} onClose={() => setShowSheet(false)} t={t} />,
        document.body,
      )}

      {/* 투표자 프로필 모달 (미리보기 영역에서 클릭 시) */}
      {mounted && profileModalUserId && (
        <UserProfileModal
          userId={profileModalUserId}
          onClose={() => setProfileModalUserId(null)}
          onViewTouches={(id) => setTouchesModalUserId(id)}
        />
      )}
      {mounted && touchesModalUserId && (
        <UserTouchesModal
          userId={touchesModalUserId}
          onClose={() => setTouchesModalUserId(null)}
        />
      )}
    </div>
  )
}
