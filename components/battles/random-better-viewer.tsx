'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, Check, Heart } from 'lucide-react'
import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { submitVote } from '@/actions/votes'
import { toggleLike } from '@/actions/likes'

type Phase = 'voting' | 'picked' | 'submitting' | 'voted' | 'loading' | 'empty'

interface VoteResult {
  votesA: number
  votesB: number
  total: number
}

export function RandomBetterViewer({
  initialBattle,
  isDemo = false,
}: {
  initialBattle: BattleForVoting | null
  isDemo?: boolean
}) {
  const [battle, setBattle] = useState<BattleForVoting | null>(initialBattle)
  const [phase, setPhase] = useState<Phase>(initialBattle ? 'voting' : 'empty')
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null)
  const [reason, setReason] = useState('')
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null)
  const [seenIds, setSeenIds] = useState<string[]>(initialBattle ? [initialBattle.id] : [])
  const [error, setError] = useState<string | null>(null)
  const [likeCount, setLikeCount] = useState(initialBattle?.likeCount ?? 0)
  const [isLiked, setIsLiked] = useState(initialBattle?.isLiked ?? false)
  const [likePending, setLikePending] = useState(false)
  const [, startTransition] = useTransition()

  function handlePickPhoto(choice: 'A' | 'B') {
    if (phase !== 'voting') return
    setSelectedChoice(choice)
    setPhase('picked')
  }

  function handleCancel() {
    setSelectedChoice(null)
    setReason('')
    setError(null)
    setPhase('voting')
  }

  function handleSubmit() {
    if (!battle || !selectedChoice) return
    setError(null)
    setPhase('submitting')

    if (isDemo) {
      const base = 15 + Math.floor(Math.random() * 30)
      const total = 40 + Math.floor(Math.random() * 40)
      setVoteResult({
        votesA: selectedChoice === 'A' ? base : total - base,
        votesB: selectedChoice === 'B' ? base : total - base,
        total,
      })
      setPhase('voted')
      return
    }

    startTransition(async () => {
      const result = await submitVote(battle.id, selectedChoice, reason.trim() || undefined)
      if ('error' in result) {
        setError(result.error)
        setPhase('picked')
        return
      }
      setVoteResult({ votesA: result.votesA, votesB: result.votesB, total: result.total })
      setPhase('voted')
    })
  }

  function handleNext() {
    setPhase('loading')
    startTransition(async () => {
      const next = await getRandomBattle(seenIds)
      if (!next) {
        setPhase('empty')
        return
      }
      setBattle(next)
      setSeenIds((prev) => [...prev, next.id])
      setSelectedChoice(null)
      setReason('')
      setVoteResult(null)
      setError(null)
      setLikeCount(next.likeCount)
      setIsLiked(next.isLiked)
      setPhase('voting')
    })
  }

  async function handleLike() {
    if (!battle || likePending) return
    if (isDemo) {
      setIsLiked((p) => !p)
      setLikeCount((p) => (isLiked ? p - 1 : p + 1))
      return
    }
    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked((p) => !p)
    setLikeCount((p) => (prevLiked ? p - 1 : p + 1))
    setLikePending(true)
    const result = await toggleLike(battle.id)
    setLikePending(false)
    if ('error' in result) {
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
    } else {
      setIsLiked(result.isLiked)
      setLikeCount(result.likeCount)
    }
  }

  if (phase === 'loading') return <LoadingSkeleton />

  if (phase === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card px-8 py-24 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <p className="text-xl font-bold">모두 다 봤어요!</p>
        <p className="mt-2 text-sm text-muted-foreground">새로운 Better가 올라오면 다시 돌아오세요.</p>
      </div>
    )
  }

  if (!battle) return null

  const pctA =
    voteResult && voteResult.total > 0
      ? Math.round((voteResult.votesA / voteResult.total) * 100)
      : 0
  const pctB = voteResult ? 100 - pctA : 0

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 px-4 py-4 md:px-6 md:py-5">
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-snug text-foreground md:text-lg">{battle.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {phase === 'voting' && '사진을 눌러 선택하세요'}
            {(phase === 'picked' || phase === 'submitting') && '이유를 남기고 투표하세요 (선택사항)'}
            {phase === 'voted' && '투표 완료! 결과를 확인하세요.'}
          </p>
        </div>
        <button
          onClick={handleLike}
          disabled={likePending}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-all hover:border-rose-200 hover:bg-rose-50 disabled:opacity-60 active:scale-95"
          style={{ color: isLiked ? '#F43F5E' : undefined }}
        >
          <span className="text-muted-foreground" style={{ color: isLiked ? '#F43F5E' : undefined }}>Hot100에 추천하기</span>
          <Heart
            size={14}
            style={{
              fill: isLiked ? '#F43F5E' : 'transparent',
              stroke: isLiked ? '#F43F5E' : 'currentColor',
              transition: 'all 0.15s',
            }}
          />
          <span className="tabular-nums">{likeCount}</span>
        </button>
      </div>

      {/* 사진 두 장 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <PhotoCard
          imageUrl={battle.imageAUrl}
          description={battle.imageADescription}
          side="A"
          phase={phase}
          selectedChoice={selectedChoice}
          pct={pctA}
          votes={voteResult?.votesA ?? 0}
          isWinner={(voteResult?.votesA ?? 0) > (voteResult?.votesB ?? 0)}
          onClick={() => handlePickPhoto('A')}
        />
        <PhotoCard
          imageUrl={battle.imageBUrl}
          description={battle.imageBDescription}
          side="B"
          phase={phase}
          selectedChoice={selectedChoice}
          pct={pctB}
          votes={voteResult?.votesB ?? 0}
          isWinner={(voteResult?.votesB ?? 0) > (voteResult?.votesA ?? 0)}
          onClick={() => handlePickPhoto('B')}
        />
      </div>

      {/* 이유 입력 + 투표 버튼 */}
      {(phase === 'picked' || phase === 'submitting') && (
        <div className="space-y-3 border-t border-border px-4 py-4 md:px-6">
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="이유를 남겨주세요 (선택사항)"
            maxLength={200}
            rows={2}
            disabled={phase === 'submitting'}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={phase === 'submitting'}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={phase === 'submitting'}
              className="rounded-xl px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-60 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {phase === 'submitting' ? '투표 중…' : '투표하기'}
            </button>
          </div>
        </div>
      )}

      {/* 다음 버튼 */}
      {phase === 'voted' && (
        <div className="flex justify-end border-t border-border px-4 py-4 md:px-6">
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            다음 Better
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PhotoCard ──────────────────────────────────────────────────────
function PhotoCard({
  imageUrl,
  description,
  side,
  phase,
  selectedChoice,
  pct,
  votes,
  isWinner,
  onClick,
}: {
  imageUrl: string
  description: string | null
  side: 'A' | 'B'
  phase: Phase
  selectedChoice: 'A' | 'B' | null
  pct: number
  votes: number
  isWinner: boolean
  onClick: () => void
}) {
  const isSelected = selectedChoice === side
  const isRejected = selectedChoice !== null && !isSelected
  const canClick = phase === 'voting'
  const showVoteOverlay = phase === 'voted'

  return (
    <div
      onClick={canClick ? onClick : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        cursor: canClick ? 'pointer' : 'default',
        borderLeft: side === 'B' ? '1px solid var(--color-border)' : undefined,
        transition: 'opacity 0.25s',
        opacity: isRejected ? 0.4 : 1,
      }}
    >
      {/* 이미지 */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`사진 ${side}`}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s',
          }}
        />

        {/* voting: 사이드 레이블 */}
        {canClick && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 2,
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(8px)',
            color: '#6366F1',
            fontSize: '0.7rem', fontWeight: 800,
            padding: '2px 10px', borderRadius: 999,
            letterSpacing: '0.05em',
          }}>
            {side}
          </div>
        )}

        {/* picked: 선택 표시 */}
        {(phase === 'picked' || phase === 'submitting') && isSelected && (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to top, rgba(99,102,241,0.6) 0%, transparent 60%)',
            }} />
            <div style={{
              position: 'absolute', top: 10, right: 10, zIndex: 2,
              background: '#6366F1',
              borderRadius: '50%',
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(99,102,241,0.5)',
            }}>
              <Check size={16} color="white" strokeWidth={3} />
            </div>
            <div style={{
              position: 'absolute', bottom: 10, left: 0, right: 0, zIndex: 2,
              textAlign: 'center',
            }}>
              <span style={{
                background: 'white', color: '#6366F1',
                fontSize: '0.7rem', fontWeight: 800,
                padding: '3px 12px', borderRadius: 999,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                내 선택
              </span>
            </div>
          </>
        )}

        {/* voted: 통계 오버레이 */}
        {showVoteOverlay && (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 55%, transparent 80%)',
            }} />
            {isSelected && (
              <div style={{
                position: 'absolute', top: 10, left: 10, zIndex: 3,
                background: '#6366F1', color: 'white',
                fontSize: '0.65rem', fontWeight: 800,
                padding: '3px 10px', borderRadius: 999,
              }}>
                내 선택
              </div>
            )}
            {isWinner && (
              <div style={{
                position: 'absolute', top: 10, right: 10, zIndex: 3,
                background: 'rgba(255,255,255,0.22)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                fontSize: '0.65rem', fontWeight: 700,
                padding: '3px 10px', borderRadius: 999,
              }}>
                우세
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
              padding: '12px',
            }}>
              <p style={{ color: 'white', fontSize: '2rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>
                {pct}%
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', marginTop: 2 }}>
                {votes}명 선택
              </p>
              <div style={{
                marginTop: 8, height: 4, width: '100%',
                borderRadius: 999, background: 'rgba(255,255,255,0.25)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #818CF8, #A78BFA)',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 설명 */}
      {description && (
        <p className="border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="h-[74px] animate-pulse border-b border-border bg-muted" />
      <div className="grid grid-cols-2">
        <div className="aspect-square animate-pulse bg-muted" />
        <div className="aspect-square animate-pulse border-l border-border bg-muted" />
      </div>
    </div>
  )
}
