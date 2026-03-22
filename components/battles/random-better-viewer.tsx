'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronRight, Check, Heart, ChevronUp, Share2, X } from 'lucide-react'
import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { submitVote } from '@/actions/votes'
import { toggleLike } from '@/actions/likes'
import { CATEGORY_FILTERS, CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'

type Phase = 'voting' | 'picked' | 'submitting' | 'voted' | 'loading' | 'empty'
type SlideDir = 'none' | 'enter-up' | 'enter-down'
type DetailPhoto = { url: string; description: string | null; side: 'A' | 'B' }

interface VoteResult {
  votesA: number
  votesB: number
  total: number
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

export function RandomBetterViewer({
  initialBattle,
  initialCategory = 'all',
  isDemo = false,
}: {
  initialBattle: BattleForVoting | null
  initialCategory?: CategoryFilter
  isDemo?: boolean
}) {
  const [battle, setBattle] = useState<BattleForVoting | null>(initialBattle)
  const [phase, setPhase] = useState<Phase>(initialBattle ? 'voting' : 'empty')
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null)
  const [reason, setReason] = useState('')
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(initialCategory)
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return initialBattle ? [initialBattle.id] : []
    try {
      const stored = sessionStorage.getItem('seenBattleIds')
      const prev: string[] = stored ? JSON.parse(stored) : []
      const merged = new Set([...prev, ...(initialBattle ? [initialBattle.id] : [])])
      return [...merged]
    } catch {
      return initialBattle ? [initialBattle.id] : []
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [likeCount, setLikeCount] = useState(initialBattle?.likeCount ?? 0)
  const [isLiked, setIsLiked] = useState(initialBattle?.isLiked ?? false)
  const [likePending, setLikePending] = useState(false)

  // ── 제스처 힌트 ────────────────────────────────────────────────────
  const [showHint, setShowHint] = useState(false)
  const [detailPhoto, setDetailPhoto] = useState<DetailPhoto | null>(null)

  useEffect(() => {
    try {
      if (!localStorage.getItem('betterHintDone')) {
        setShowHint(true)
        const t = setTimeout(dismissHint, 3000)
        return () => clearTimeout(t)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismissHint() {
    setShowHint(false)
    try { localStorage.setItem('betterHintDone', '1') } catch {}
  }

  // ── 세로 스와이프를 위한 히스토리 ──────────────────────────────────
  const [historyStack, setHistoryStack] = useState<BattleForVoting[]>([])
  const [slideDir, setSlideDir] = useState<SlideDir>('none')

  // ── 터치 상태 ──────────────────────────────────────────────────────
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  // 스와이프 중 수직 방향으로 확정된 경우 가로 방향 전파 차단
  const swipeAxis = useRef<'none' | 'vertical' | 'horizontal'>('none')

  const [, startTransition] = useTransition()

  useEffect(() => {
    try { sessionStorage.setItem('seenBattleIds', JSON.stringify(seenIds)) } catch {}
  }, [seenIds])

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

  // ── 다음 Better 로드 (공통 로직) ──────────────────────────────────
  function loadNext(cat: CategoryFilter, currentSeenIds: string[]) {
    setPhase('loading')
    startTransition(async () => {
      const c = cat !== 'all' ? cat : undefined
      const next = await getRandomBattle(currentSeenIds, c)
      if (!next) {
        try { sessionStorage.removeItem('seenBattleIds') } catch {}
        setPhase('empty')
        return
      }
      setBattle(next)
      setSeenIds(prev => [...prev, next.id])
      setSelectedChoice(null)
      setReason('')
      setVoteResult(null)
      setError(null)
      setLikeCount(next.likeCount)
      setIsLiked(next.isLiked)
      setPhase('voting')
      // 새 카드 진입 애니메이션
      setSlideDir('enter-up')
      setTimeout(() => setSlideDir('none'), 320)
    })
  }

  function handleNext() {
    // 현재 battle을 히스토리에 저장
    if (battle) setHistoryStack(h => [...h.slice(-9), battle])
    loadNext(categoryFilter, seenIds)
  }

  // ── 이전 Better로 복귀 ────────────────────────────────────────────
  function handlePrev() {
    if (historyStack.length === 0) return
    const prev = historyStack[historyStack.length - 1]
    setHistoryStack(h => h.slice(0, -1))
    // 현재 battle을 seen에서 제거 (다시 나올 수 있도록)
    if (battle) setSeenIds(ids => ids.filter(id => id !== battle.id))
    setBattle(prev)
    setSelectedChoice(null)
    setReason('')
    setVoteResult(null)
    setError(null)
    setLikeCount(prev.likeCount)
    setIsLiked(prev.isLiked)
    setPhase('voting')
    setSlideDir('enter-down')
    setTimeout(() => setSlideDir('none'), 320)
  }

  function handleCategoryChange(newCat: CategoryFilter) {
    if (newCat === categoryFilter) return
    setCategoryFilter(newCat)
    setHistoryStack([]) // 카테고리 변경 시 히스토리 초기화
    const freshSeenIds: string[] = []
    setSeenIds(freshSeenIds)
    loadNext(newCat, freshSeenIds)
  }

  async function handleShare() {
    if (!battle) return
    const url = `${window.location.origin}/battles/${battle.id}`
    try {
      await navigator.share({ title: battle.title, url })
    } catch {
      try { await navigator.clipboard.writeText(url) } catch {}
    }
  }

  async function handleLike() {
    if (!battle || likePending) return
    if (isDemo) {
      setIsLiked(p => !p)
      setLikeCount(p => (isLiked ? p - 1 : p + 1))
      return
    }
    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked(p => !p)
    setLikeCount(p => (prevLiked ? p - 1 : p + 1))
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

  // ── 세로 스와이프 핸들러 ──────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipeAxis.current = 'none'
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (swipeAxis.current === 'none') {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
      if (dx > 8 || dy > 8) {
        swipeAxis.current = dy > dx ? 'vertical' : 'horizontal'
      }
    }
    // 세로로 확정된 경우 기본 스크롤 차단 (passive:false 필요 → DOM 이벤트로 처리)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // 세로 스와이프 조건: 수직 이동이 수평보다 크고 40px 이상
    if (absDy > absDx * 1.2 && absDy > 40) {
      // 다른 컴포넌트(SwipeSections)로 이벤트 전파 차단
      e.stopPropagation()

      if (phase === 'submitting') return

      if (dy < 0) {
        // 위로 스와이프 → 다음 Better (TikTok/Reels 방향)
        handleNext()
      } else {
        // 아래로 스와이프 → 이전 Better
        handlePrev()
      }
    }
  }

  const pctA = voteResult && voteResult.total > 0
    ? Math.round((voteResult.votesA / voteResult.total) * 100) : 0
  const pctB = voteResult ? 100 - pctA : 0

  // 슬라이드 애니메이션 스타일
  const slideStyle: React.CSSProperties =
    slideDir === 'enter-up'
      ? { animation: '_slideUp 0.28s cubic-bezier(0.25,1,0.5,1)' }
      : slideDir === 'enter-down'
        ? { animation: '_slideDown 0.28s cubic-bezier(0.25,1,0.5,1)' }
        : {}

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes _slideUp      { from { transform: translateY(28px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        @keyframes _slideDown    { from { transform: translateY(-28px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        @keyframes _slideUpModal { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>

      {/* ── 제스처 힌트 오버레이 ── */}
      {showHint && (
        <div
          onClick={dismissHint}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 22,
            padding: '28px 32px',
            border: '1px solid rgba(255,255,255,0.18)',
            maxWidth: 300,
            textAlign: 'center',
          }}>
            <p style={{ color: 'white', fontWeight: 800, marginBottom: 20, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              사용 방법
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                { icon: '↕️', text: '위아래 스와이프 → 다음 Better' },
                { icon: '↔️', text: '좌우 스와이프 → Top100 / 랭킹' },
                { icon: '👆', text: '사진 탭 → 투표  |  상세보기 → 크게 보기' },
              ] as const).map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.82rem', lineHeight: 1.45 }}>{text}</span>
                </div>
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: 22 }}>탭하면 닫힙니다</p>
          </div>
        </div>
      )}

      {/* ── 사진 상세보기 모달 ── */}
      {detailPhoto && (
        <PhotoDetailModal
          url={detailPhoto.url}
          description={detailPhoto.description}
          side={detailPhoto.side}
          onClose={() => setDetailPhoto(null)}
        />
      )}

      {/* 카테고리 필터 탭 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => handleCategoryChange(f.id)}
            style={{ fontSize: '11px' }}
            className={[
              'rounded-full px-1.5 py-1 font-semibold transition-all',
              categoryFilter === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* 메인 카드 — 세로 스와이프 영역 */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        // pan-x: 브라우저는 수평 스크롤만 처리, 수직은 JS가 처리
        // 가로 스와이프는 이벤트 버블링으로 SwipeSections에 전달
        style={{ touchAction: 'pan-x', userSelect: 'none' }}
      >
        {phase === 'loading' ? (
          <LoadingSkeleton />
        ) : phase === 'empty' ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card px-8 py-24 text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <p className="text-xl font-bold">모두 다 봤어요!</p>
            <p className="mt-2 text-sm text-muted-foreground">새로운 Better가 올라오면 다시 돌아오세요.</p>
          </div>
        ) : !battle ? null : (
          <div
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
            style={slideStyle}
          >
            {/* 헤더 */}
            <div className="px-4 py-3 md:px-6 md:py-4">
              {(() => {
                const cat = CATEGORY_MAP[battle.category]
                const style = CAT_BADGE[battle.category]
                return (
                  <span
                    className="mb-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {cat.emoji} {cat.label}
                  </span>
                )
              })()}
              <h2 className="text-base font-bold leading-snug text-foreground md:text-lg">{battle.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {phase === 'voting' && '사진을 눌러 선택하세요'}
                {(phase === 'picked' || phase === 'submitting') && '이유를 남기고 투표하세요 (선택사항)'}
                {phase === 'voted' && '투표 완료! 결과를 확인하세요.'}
              </p>
            </div>

            {/* 사진 두 장 + 우측 액션 버튼 오버레이 */}
            <div style={{ position: 'relative' }}>
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
                  onDetail={() => setDetailPhoto({ url: battle.imageAUrl, description: battle.imageADescription, side: 'A' })}
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
                  onDetail={() => setDetailPhoto({ url: battle.imageBUrl, description: battle.imageBDescription, side: 'B' })}
                />
              </div>

              {/* 우측 세로 액션 버튼 */}
              <div style={{
                position: 'absolute', right: 10, bottom: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                zIndex: 20,
              }}>
                {/* 좋아요 */}
                <button
                  onClick={handleLike}
                  disabled={likePending}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    opacity: likePending ? 0.6 : 1,
                  }}
                >
                  <span style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.15s',
                  }}>
                    <Heart
                      size={20}
                      style={{
                        fill: isLiked ? '#F43F5E' : 'transparent',
                        stroke: isLiked ? '#F43F5E' : 'white',
                        transition: 'all 0.15s',
                      }}
                    />
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1 }}>
                    {likeCount}
                  </span>
                </button>

                {/* 공유 */}
                <button
                  onClick={handleShare}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  <span style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Share2 size={20} color="white" />
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1 }}>
                    공유
                  </span>
                </button>
              </div>
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

            {/* 투표 완료 후: 다음 버튼 + 스와이프 힌트 */}
            {phase === 'voted' && (
              <div className="flex items-center justify-between border-t border-border px-4 py-4 md:px-6">
                {/* 이전 버튼 */}
                <button
                  onClick={handlePrev}
                  disabled={historyStack.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-30"
                >
                  <ChevronUp size={15} />
                  이전
                </button>

                {/* 스와이프 힌트 */}
                <span className="text-xs text-muted-foreground/60 select-none">
                  ↑ 위로 스와이프
                </span>

                {/* 다음 버튼 */}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  다음
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* voting 단계: 스와이프 힌트 (최초 1회) */}
            {phase === 'voting' && (
              <div className="flex justify-center border-t border-border/50 py-2">
                <span className="text-xs text-muted-foreground/40 select-none">
                  ↑ 스와이프로 넘기기
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PhotoCard ──────────────────────────────────────────────────────────────

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
  onDetail,
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
  onDetail: () => void
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
      <div style={{ position: 'relative', width: '100%', paddingTop: '120%', overflow: 'hidden' }}>
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

        {/* 기본 하단 그라데이션 오버레이 (voting / picked / submitting 단계) */}
        {!showVoteOverlay && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 45%, transparent 70%)',
          }} />
        )}

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

        {/* 상세보기 버튼 (voting 단계) */}
        {canClick && (
          <button
            onClick={e => { e.stopPropagation(); onDetail() }}
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 4,
              background: 'rgba(0,0,0,0.52)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: 'white',
              fontSize: '0.62rem', fontWeight: 700,
              padding: '3px 9px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer', lineHeight: 1.6,
            }}
          >
            상세보기
          </button>
        )}

        {/* 설명 텍스트 오버레이 */}
        {description && !showVoteOverlay && (
          <p style={{
            position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 3,
            color: 'white', fontSize: '0.72rem', lineHeight: 1.45,
            margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {description}
          </p>
        )}

        {(phase === 'picked' || phase === 'submitting') && isSelected && (
          <>
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to top, rgba(99,102,241,0.6) 0%, transparent 60%)' }} />
            <div style={{
              position: 'absolute', top: 10, right: 10, zIndex: 2,
              background: '#6366F1', borderRadius: '50%',
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(99,102,241,0.5)',
            }}>
              <Check size={16} color="white" strokeWidth={3} />
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, zIndex: 2, textAlign: 'center' }}>
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

        {showVoteOverlay && (
          <>
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 55%, transparent 80%)' }} />
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
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, padding: '12px' }}>
              <p style={{ color: 'white', fontSize: '2rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>{pct}%</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', marginTop: 2 }}>{votes}명 선택</p>
              <div style={{ marginTop: 8, height: 4, width: '100%', borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'linear-gradient(90deg, #818CF8, #A78BFA)', transition: 'width 0.7s ease' }} />
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

// ─── PhotoDetailModal ────────────────────────────────────────────────────────

function PhotoDetailModal({
  url, description, side, onClose,
}: {
  url: string
  description: string | null
  side: 'A' | 'B'
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* X 버튼 */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', zIndex: 1,
        }}
      >
        <X size={18} />
      </button>

      {/* 사진 + 설명 */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: '_slideUpModal 0.28s cubic-bezier(0.25,1,0.5,1)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`사진 ${side}`}
          style={{
            width: '100%',
            maxHeight: 'calc(100dvh - 120px)',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        {description && (
          <p style={{
            width: '100%',
            padding: '12px 20px',
            margin: 0,
            fontSize: '0.875rem', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.75)',
            background: 'rgba(0,0,0,0.4)',
          }}>
            {description}
          </p>
        )}
      </div>
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
