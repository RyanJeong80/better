'use client'

import { useState, useRef, useTransition, useCallback, useEffect } from 'react'
import { useSwipeable } from 'react-swipeable'
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
}

type AnimState = 'idle' | 'dragging' | 'advancing' | 'snapping'

// ─── 카테고리 색상 ──────────────────────────────────────────────────

const CAT_BADGE: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#EFF6FF', text: '#2563EB' },
  appearance: { bg: '#FDF2F8', text: '#BE185D' },
  love:       { bg: '#FFF1F2', text: '#F43F5E' },
  shopping:   { bg: '#FFFBEB', text: '#D97706' },
  food:       { bg: '#FFF7ED', text: '#EA580C' },
  it:         { bg: '#F5F3FF', text: '#7C3AED' },
  decision:   { bg: '#F0FDF4', text: '#15803D' },
}

// ─── 헬퍼 ──────────────────────────────────────────────────────────

function createCard(battle: BattleForVoting): CardData {
  return { battle, phase: 'voting', choice: null, result: null, likeCount: battle.likeCount, isLiked: battle.isLiked }
}

const PEEK = 40   // 다음 카드가 보이는 너비(px)
const GAP  = 8    // 카드 사이 간격(px)

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────

export function HomeSwipeableBetter({ initialBattle }: { initialBattle: BattleForVoting | null }) {
  const [cards, setCards]             = useState<CardData[]>(initialBattle ? [createCard(initialBattle)] : [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragX, setDragX]             = useState(0)
  const [animState, setAnimState]     = useState<AnimState>('idle')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const seenIdsRef   = useRef<string[]>(initialBattle ? [initialBattle.id] : [])
  const isLoadingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState(0)

  const [, startTransition] = useTransition()

  // ── 컨테이너 너비 측정 ──
  useEffect(() => {
    if (!containerRef.current) return
    const update = () => {
      if (containerRef.current) setCardWidth(containerRef.current.offsetWidth - PEEK)
    }
    update()
    const obs = new ResizeObserver(update)
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // ── 다음 배틀 로드 ──
  const loadNext = useCallback((cat: CategoryFilter) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    const category = cat !== 'all' ? cat : undefined
    startTransition(async () => {
      const next = await getRandomBattle(seenIdsRef.current, category)
      isLoadingRef.current = false
      if (!next) return
      seenIdsRef.current = [...seenIdsRef.current, next.id]
      setCards(prev => [...prev, createCard(next)])
    })
  }, [])

  // 앞으로 3장 미리 로드
  useEffect(() => {
    if (cards.length < currentIndex + 3) loadNext(categoryFilter)
  }, [currentIndex, cards.length, categoryFilter, loadNext])

  // ── 다음 카드로 전환 ──
  function advanceToNext() {
    if (animState === 'advancing') return
    setAnimState('advancing')
    setDragX(0)
    setCurrentIndex(prev => prev + 1)
    setTimeout(() => setAnimState('idle'), 380)
  }

  // ── 투표 ──
  function handleVote(cardIdx: number, choice: 'A' | 'B') {
    const card = cards[cardIdx]
    if (!card || card.phase === 'voted') return
    startTransition(async () => {
      const result = await submitVote(card.battle.id, choice, undefined)
      if ('error' in result) return
      setCards(prev => prev.map((c, i) =>
        i === cardIdx
          ? { ...c, phase: 'voted', choice, result: { votesA: result.votesA, votesB: result.votesB, total: result.total } }
          : c
      ))
      setTimeout(() => advanceToNext(), 1300)
    })
  }

  // ── 좋아요 ──
  function handleLike(cardIdx: number) {
    const card = cards[cardIdx]
    if (!card) return
    // 낙관적 업데이트
    setCards(prev => prev.map((c, i) =>
      i === cardIdx ? { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1 } : c
    ))
    startTransition(async () => {
      const res = await toggleLike(card.battle.id)
      if ('error' in res) {
        // 실패 시 원복
        setCards(prev => prev.map((c, i) =>
          i === cardIdx ? { ...c, isLiked: card.isLiked, likeCount: card.likeCount } : c
        ))
      } else {
        setCards(prev => prev.map((c, i) =>
          i === cardIdx ? { ...c, isLiked: res.isLiked, likeCount: res.likeCount } : c
        ))
      }
    })
  }

  // ── 카테고리 변경 ──
  function handleCategoryChange(cat: CategoryFilter) {
    if (cat === categoryFilter) return
    setCategoryFilter(cat)
    seenIdsRef.current = []
    setCards([])
    setCurrentIndex(0)
    setDragX(0)
    setAnimState('idle')
    isLoadingRef.current = false
    loadNext(cat)
  }

  // ── 스와이프 핸들러 ──
  const pitch = cardWidth + GAP

  const swipeHandlers = useSwipeable({
    onSwiping: ({ deltaX }) => {
      if (animState !== 'idle' && animState !== 'dragging') return
      setAnimState('dragging')
      setDragX(deltaX)
    },
    onSwipedLeft: ({ absX, velocity }) => {
      if (absX > cardWidth * 0.25 || velocity > 0.5) {
        advanceToNext()
      } else {
        setAnimState('snapping')
        setDragX(0)
        setTimeout(() => setAnimState('idle'), 260)
      }
    },
    onSwipedRight: () => {
      setAnimState('snapping')
      setDragX(0)
      setTimeout(() => setAnimState('idle'), 260)
    },
    onTouchEndOrOnMouseUp: () => {
      if (animState === 'dragging' && Math.abs(dragX) < cardWidth * 0.25) {
        setAnimState('snapping')
        setDragX(0)
        setTimeout(() => setAnimState('idle'), 260)
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 8,
  })

  // containerRef와 swipeHandlers의 ref 결합
  const { ref: swipeRef, ...swipeEvents } = swipeHandlers
  const bindRefs = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
    swipeRef(el)
  }, [swipeRef])

  const translateX = -(currentIndex * pitch) + dragX

  const transition = animState === 'dragging' ? 'none'
    : animState === 'advancing' ? 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)'
    : animState === 'snapping'  ? 'transform 0.25s ease'
    : 'none'

  // ── 빈 상태 ──
  const currentCard = cards[currentIndex]
  const isEmpty = cards.length === 0

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

      {/* 스와이프 영역 */}
      <div ref={bindRefs} style={{ overflow: 'hidden', cursor: 'grab', userSelect: 'none' }} {...swipeEvents}>
        {isEmpty ? (
          <div style={{
            height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 20, border: '2px dashed var(--color-border)',
          }}>
            <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9rem' }}>로딩 중…</p>
          </div>
        ) : cardWidth > 0 ? (
          <div style={{
            display: 'flex',
            gap: GAP,
            transform: `translateX(${translateX}px)`,
            transition,
            willChange: 'transform',
          }}>
            {cards.map((card, idx) => (
              <div key={card.battle.id} style={{ width: cardWidth, flexShrink: 0 }}>
                <BattleCard
                  card={card}
                  isActive={idx === currentIndex}
                  onVote={(choice) => handleVote(idx, choice)}
                  onNext={advanceToNext}
                  onLike={() => handleLike(idx)}
                />
              </div>
            ))}
            {/* 마지막 더미 카드 */}
            <div style={{
              width: cardWidth, flexShrink: 0, height: 360, borderRadius: 20,
              background: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.85rem' }}>모두 봤어요!</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* 스와이프 힌트 */}
      {!isEmpty && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          color: 'var(--color-muted-foreground)', fontSize: '0.72rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontSize: '1rem' }}>👈</span>
            <span>스와이프로 넘기기</span>
          </div>
          <span style={{ width: 1, height: 12, background: 'var(--color-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>사진 탭하여 선택</span>
            <span style={{ fontSize: '1rem' }}>👆</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 개별 배틀 카드 ────────────────────────────────────────────────

function BattleCard({ card, isActive, onVote, onNext, onLike }: {
  card: CardData
  isActive: boolean
  onVote: (choice: 'A' | 'B') => void
  onNext: () => void
  onLike: () => void
}) {
  const { battle, phase, choice, result, likeCount, isLiked } = card
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
      boxShadow: isActive
        ? '0 8px 32px rgba(0,0,0,0.14)'
        : '0 2px 8px rgba(0,0,0,0.05)',
      transform: isActive ? 'scale(1)' : 'scale(0.97)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    }}>
      {/* 헤더 */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            borderRadius: 999, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700,
            background: catStyle.bg, color: catStyle.text, marginBottom: 4,
          }}>
            {cat.emoji} {cat.label}
          </span>
          <h3 style={{
            fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.35,
            color: 'var(--color-foreground)', overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {battle.title}
          </h3>
        </div>

        {/* 좋아요 버튼 */}
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

      {/* 이미지 영역 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)' }}>
        {(['A', 'B'] as const).map((side) => {
          const imgUrl  = side === 'A' ? battle.imageAUrl : battle.imageBUrl
          const desc    = side === 'A' ? battle.imageADescription : battle.imageBDescription
          const pct     = side === 'A' ? pctA : pctB
          const votes   = result ? (side === 'A' ? result.votesA : result.votesB) : 0
          const isWinner = result ? (side === 'A' ? result.votesA >= result.votesB : result.votesB > result.votesA) : false
          const isChosen = choice === side

          return (
            <div
              key={side}
              onClick={() => phase === 'voting' && onVote(side)}
              style={{
                position: 'relative',
                paddingTop: '100%',
                cursor: phase === 'voting' ? 'pointer' : 'default',
                borderLeft: side === 'B' ? '2px solid var(--color-background)' : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={`사진 ${side}`}
                draggable={false}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* 투표 전: A/B 레이블 */}
              {phase === 'voting' && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '10px',
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: 'white', fontWeight: 900, fontSize: '1.1rem',
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.5)',
                  }}>
                    {side}
                  </span>
                </div>
              )}

              {/* 투표 후: 결과 오버레이 */}
              {phase === 'voted' && result && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 55%, transparent 80%)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px',
                }}>
                  <p style={{ color: 'white', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{pct}%</p>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem', marginTop: 2 }}>{votes}명</p>
                  <div style={{ marginTop: 5, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 999,
                      background: 'linear-gradient(90deg, #818CF8, #A78BFA)', transition: 'width 0.7s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* 우세 배지 */}
              {phase === 'voted' && isWinner && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color: 'white', fontSize: '0.6rem', fontWeight: 800,
                  padding: '3px 8px', borderRadius: 999,
                }}>
                  우세
                </div>
              )}

              {/* 내 선택 배지 */}
              {phase === 'voted' && isChosen && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white', fontSize: '0.6rem', fontWeight: 800,
                  padding: '3px 7px', borderRadius: 999,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <Check size={9} /> 내 선택
                </div>
              )}

              {/* 설명 */}
              {desc && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.55)', padding: '4px 8px',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.62rem', lineHeight: 1.3 }}>{desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 푸터 */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)' }}>
        {phase === 'voting' ? (
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-muted-foreground)' }}>
            사진을 탭하여 선택하거나, 스와이프로 넘기세요
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
