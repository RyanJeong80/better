'use client'

import { useState, useRef, useTransition, useCallback, useEffect } from 'react'
import { Heart, ChevronRight, Check } from 'lucide-react'
import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { submitVote } from '@/actions/votes'
import { toggleLike } from '@/actions/likes'
import { CATEGORY_FILTERS, CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'

// ─── 타입 ──────────────────────────────────────────────────────────

interface CardData {
  battle: BattleForVoting
  phase: 'voting' | 'voted'
  choice: 'A' | 'B' | null
  result: { votesA: number; votesB: number; total: number } | null
  likeCount: number
  isLiked: boolean
  voteError?: string
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

function createCard(b: BattleForVoting): CardData {
  return { battle: b, phase: 'voting', choice: null, result: null, likeCount: b.likeCount, isLiked: b.isLiked }
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────

export function HomeBetterViewer({ initialBattle }: { initialBattle: BattleForVoting | null }) {
  const [card, setCard]                 = useState<CardData | null>(initialBattle ? createCard(initialBattle) : null)
  const [isLoading, setIsLoading]       = useState(!initialBattle)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [isEmpty, setIsEmpty]           = useState(false)

  const seenIdsRef   = useRef<string[]>(initialBattle ? [initialBattle.id] : [])
  const isLoadingRef = useRef(false)

  const [, startTransition] = useTransition()

  // 다음 배틀 로드
  const loadNext = useCallback((cat: CategoryFilter, resetSeen = false) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setIsLoading(true)
    setIsEmpty(false)
    const category = cat !== 'all' ? cat : undefined
    const seenIds = resetSeen ? [] : seenIdsRef.current
    startTransition(async () => {
      try {
        const next = await getRandomBattle(seenIds, category)
        if (next) {
          seenIdsRef.current = [...seenIds, next.id]
          setCard(createCard(next))
          setIsEmpty(false)
        } else {
          setCard(null)
          setIsEmpty(true)
        }
      } catch {
        setCard(null)
        setIsEmpty(true)
      } finally {
        isLoadingRef.current = false
        setIsLoading(false)
      }
    })
  }, [])

  // 초기 로드 (initialBattle 없을 때)
  useEffect(() => {
    if (!initialBattle) loadNext(categoryFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 다음 카드로 넘기기
  function goNext() {
    loadNext(categoryFilter)
  }

  // 투표
  function handleVote(choice: 'A' | 'B') {
    if (!card || card.phase === 'voted') return
    startTransition(async () => {
      try {
        const res = await submitVote(card.battle.id, choice, undefined)
        if (!('error' in res)) {
          setCard(prev => prev ? {
            ...prev, phase: 'voted', choice,
            result: { votesA: res.votesA, votesB: res.votesB, total: res.total },
          } : null)
        } else {
          setCard(prev => prev ? { ...prev, voteError: res.error } : null)
          setTimeout(goNext, 3000)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '투표 중 오류가 발생했습니다'
        setCard(prev => prev ? { ...prev, voteError: msg } : null)
        setTimeout(goNext, 3000)
      }
    })
  }

  // 좋아요 (낙관적 업데이트)
  function handleLike() {
    if (!card) return
    const prev = { isLiked: card.isLiked, likeCount: card.likeCount }
    setCard(c => c ? { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1 } : null)
    startTransition(async () => {
      try {
        const res = await toggleLike(card.battle.id)
        if ('error' in res) {
          setCard(c => c ? { ...c, isLiked: prev.isLiked, likeCount: prev.likeCount } : null)
        } else {
          setCard(c => c ? { ...c, isLiked: res.isLiked, likeCount: res.likeCount } : null)
        }
      } catch {
        setCard(c => c ? { ...c, isLiked: prev.isLiked, likeCount: prev.likeCount } : null)
      }
    })
  }

  // 카테고리 변경
  function handleCategoryChange(cat: CategoryFilter) {
    if (cat === categoryFilter) return
    setCategoryFilter(cat)
    isLoadingRef.current = false
    loadNext(cat, true)
  }

  return (
    <div className="space-y-3">
      {/* 카테고리 필터 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem' }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => handleCategoryChange(f.id)}
            style={{ fontSize: '11px' }}
            className={[
              'rounded-full px-1 py-0.5 font-semibold transition-all',
              categoryFilter === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* 카드 영역 */}
      {isLoading ? (
        <div style={{
          height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 20, border: '2px dashed var(--color-border)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
            <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.85rem' }}>Better 불러오는 중…</p>
          </div>
        </div>
      ) : isEmpty || !card ? (
        <div style={{
          height: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 20, border: '2px dashed var(--color-border)',
        }}>
          <span style={{ fontSize: '2rem' }}>🎉</span>
          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>모든 Better를 봤어요!</p>
          <button
            onClick={() => { seenIdsRef.current = []; loadNext(categoryFilter, true) }}
            style={{
              marginTop: 4, padding: '6px 16px', borderRadius: 999,
              background: 'var(--color-primary)', color: 'var(--color-primary-foreground)',
              fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer',
            }}
          >
            다시 보기
          </button>
        </div>
      ) : (
        <BattleCard
          card={card}
          onVote={handleVote}
          onNext={goNext}
          onLike={handleLike}
        />
      )}
    </div>
  )
}

// ─── 개별 배틀 카드 ────────────────────────────────────────────────

function BattleCard({ card, onVote, onNext, onLike }: {
  card: CardData
  onVote: (choice: 'A' | 'B') => void
  onNext: () => void
  onLike: () => void
}) {
  const { battle, phase, choice, result, likeCount, isLiked, voteError } = card
  const cat      = CATEGORY_MAP[battle.category]
  const catStyle = CAT_BADGE[battle.category]

  const pctA = result && result.total > 0 ? Math.round((result.votesA / result.total) * 100) : 0
  const pctB = result ? 100 - pctA : 0

  return (
    <div style={{
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      background: 'var(--color-card)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      {/* 헤더 */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            borderRadius: 999, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700,
            background: catStyle.bg, color: catStyle.text, marginBottom: 4,
          }}>
            {cat.emoji} {cat.label}
          </span>
          <h3 style={{
            fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.35,
            color: 'var(--color-foreground)',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {battle.title}
          </h3>
        </div>
        <button
          onClick={onLike}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3,
            borderRadius: 999, padding: '4px 9px',
            border: `1px solid ${isLiked ? '#FECDD3' : 'var(--color-border)'}`,
            background: isLiked ? '#FFF1F2' : 'transparent', cursor: 'pointer',
          }}
        >
          <Heart size={12} style={{ fill: isLiked ? '#F43F5E' : 'none', stroke: '#F43F5E' }} />
          {likeCount > 0 && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F43F5E' }}>{likeCount}</span>
          )}
        </button>
      </div>

      {/* 이미지 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)' }}>
        {(['A', 'B'] as const).map((side) => {
          const imgUrl   = side === 'A' ? battle.imageAUrl : battle.imageBUrl
          const desc     = side === 'A' ? battle.imageADescription : battle.imageBDescription
          const pct      = side === 'A' ? pctA : pctB
          const vCount   = result ? (side === 'A' ? result.votesA : result.votesB) : 0
          const isWinner = result ? (side === 'A' ? result.votesA >= result.votesB : result.votesB > result.votesA) : false
          const isChosen = choice === side

          return (
            <div
              key={side}
              onClick={() => phase === 'voting' && !voteError && onVote(side)}
              style={{
                position: 'relative', paddingTop: '100%',
                cursor: phase === 'voting' && !voteError ? 'pointer' : 'default',
                borderLeft: side === 'B' ? '2px solid var(--color-background)' : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl} alt={`사진 ${side}`} draggable={false}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* 투표 전 레이블 */}
              {phase === 'voting' && !voteError && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 10,
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: 'white', fontWeight: 900, fontSize: '1.1rem',
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.5)',
                  }}>{side}</span>
                </div>
              )}

              {/* 투표 후 결과 */}
              {phase === 'voted' && result && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 55%, transparent 80%)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 10,
                }}>
                  <p style={{ color: 'white', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{pct}%</p>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem', marginTop: 2 }}>{vCount}명</p>
                  <div style={{ marginTop: 5, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'linear-gradient(90deg,#818CF8,#A78BFA)', transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              )}

              {phase === 'voted' && isWinner && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>우세</div>
              )}
              {phase === 'voted' && isChosen && (
                <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '3px 7px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Check size={9} /> 내 선택
                </div>
              )}
              {desc && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: '4px 8px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.62rem', lineHeight: 1.3 }}>{desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 푸터 */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)' }}>
        {voteError ? (
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#F43F5E', fontWeight: 600 }}>
            ⚠️ {voteError}
          </p>
        ) : phase === 'voting' ? (
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-muted-foreground)' }}>
            사진을 탭하여 선택하세요
          </p>
        ) : (
          <button
            onClick={onNext}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', fontWeight: 700, fontSize: '0.85rem',
            }}
          >
            다음 Better <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
