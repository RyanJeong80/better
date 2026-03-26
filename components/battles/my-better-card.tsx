'use client'

import { useState } from 'react'
import { ChevronDown, Heart, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { BetterCategory } from '@/lib/constants/categories'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'
import { deleteBattle } from '@/actions/battles'

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
        <p className="border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

function DeleteConfirmDialog({
  onConfirm, onCancel, loading, error,
}: {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string | null
}) {
  const t = useTranslations()
  return (
    <>
      {/* 오버레이 */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
        }}
      />
      {/* 다이얼로그 */}
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201, width: 'min(340px, calc(100vw - 32px))',
        background: 'var(--color-background)',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '24px 20px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <p style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>
            {t('better.deleteTitle')}
          </p>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-muted-foreground)' }}
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: '0 0 16px' }}>
          {t('better.deleteMessage')}
        </p>

        {error && (
          <p style={{ fontSize: '0.78rem', color: '#EF4444', marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              border: '1.5px solid var(--color-border)', background: 'transparent',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              color: 'var(--color-foreground)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              border: 'none', background: '#EF4444',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              color: 'white',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? t('better.deleting') : t('better.deleteConfirmBtn')}
          </button>
        </div>
      </div>
    </>
  )
}

export function MyBetterCard({
  battle,
  onDeleteSuccess,
}: {
  battle: BattleStats
  onDeleteSuccess?: (id: string) => void
}) {
  const [showReasons, setShowReasons] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const t = useTranslations()

  const pctA = battle.total > 0 ? Math.round((battle.votesA / battle.total) * 100) : 0
  const pctB = battle.total > 0 ? 100 - pctA : 0
  const aWins = battle.votesA > battle.votesB
  const bWins = battle.votesB > battle.votesA
  const deadline = getDeadlineBadge(battle.closedAt, battle.winner)

  const cat = CATEGORY_MAP[battle.category]
  const catStyle = CAT_BADGE[battle.category]

  async function handleDeleteConfirm() {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteBattle(battle.id)
    setDeleting(false)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      setShowDeleteDialog(false)
      onDeleteSuccess?.(battle.id)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 px-4 py-4 md:px-5">
          <div className="min-w-0 flex-1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: catStyle.bg, color: catStyle.text }}
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
            <h3 className="font-bold leading-snug text-foreground">{battle.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {battle.total > 0 ? `총 ${battle.total}표` : '아직 투표가 없어요'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {battle.likesCount > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1">
                <Heart size={12} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                <span className="text-xs font-bold tabular-nums" style={{ color: '#F43F5E' }}>{battle.likesCount}</span>
              </div>
            )}
            <button
              onClick={() => { setDeleteError(null); setShowDeleteDialog(true) }}
              style={{
                width: 32, height: 32, borderRadius: 10,
                border: '1.5px solid var(--color-border)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-muted-foreground)',
                transition: 'all 0.15s',
              }}
              aria-label={t('better.deleteTitle')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* 이미지 */}
        <div className="grid grid-cols-2 border-t border-border">
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
          <div className="border-t border-border">
            <button
              onClick={() => setShowReasons((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-accent md:px-5"
            >
              <span className="text-muted-foreground">이유 보기</span>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {battle.reasons.length}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-muted-foreground transition-transform duration-200 ${showReasons ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {showReasons && (
              <ul className="divide-y divide-border border-t border-border">
                {battle.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-3 md:px-5">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      r.choice === 'A' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {r.choice}
                    </span>
                    <p className="text-sm text-foreground/80">{r.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteDialog && (
        <DeleteConfirmDialog
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
          loading={deleting}
          error={deleteError}
        />
      )}
    </>
  )
}
