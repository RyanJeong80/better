'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Check, Heart, ChevronDown, ChevronRight, ChevronUp, Share2, X, Search, Hash } from 'lucide-react'
import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { submitVote } from '@/actions/votes'
import { toggleLike, getMyLikedBattleIds } from '@/actions/likes'
import { CATEGORY_FILTERS, CATEGORY_MAP } from '@/lib/constants/categories'
import { calcLevel } from '@/lib/level'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'
import { countryToFlag } from '@/lib/utils/country'
import { UserProfileModal } from '@/components/ui/user-profile-modal'
import { UserTouchesModal } from '@/components/ui/user-touches-modal'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'

type Phase = 'voting' | 'picked' | 'submitting' | 'voted' | 'loading' | 'empty'
type SlideDir = 'none' | 'enter-up' | 'enter-down'
type DetailPhoto = { url: string; description: string | null; side: 'A' | 'B' }

interface VoteResult {
  votesA: number
  votesB: number
  total: number
}

// ── 텍스트 전용 카드 ──────────────────────────────────────────────
function TextCard({ text, colorIdx }: { text: string; colorIdx: number }) {
  const { bg, text: textColor } = TEXT_BG_COLORS[colorIdx]
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <p style={{
        color: textColor,
        fontWeight: 800,
        fontSize: 'clamp(1.1rem, 5vw, 2rem)',
        textAlign: 'center',
        lineHeight: 1.35,
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        display: '-webkit-box',
        WebkitLineClamp: 6,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textShadow: bg === '#f8fafc' ? 'none' : '0 1px 8px rgba(0,0,0,0.25)',
      }}>
        {text}
      </p>
    </div>
  )
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

function FitTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let size = 0.8125
    el.style.fontSize = `${size}rem`
    while (el.scrollWidth > el.offsetWidth + 1 && size > 0.65) {
      size = Math.round((size - 0.04) * 1000) / 1000
      el.style.fontSize = `${size}rem`
    }
  }, [text])
  return (
    <h2
      ref={ref}
      style={{ margin: 0, fontWeight: 800, fontSize: '0.8125rem', lineHeight: 1.3, color: '#3D2B1F', whiteSpace: 'nowrap', overflow: 'hidden' }}
    >
      {text}
    </h2>
  )
}

export function RandomBetterViewer({
  initialBattle,
  initialCategory = 'all',
  isDemo = false,
  onClose,
  showBack = false,
  onCommentOpen,
  viewerUserId,
}: {
  initialBattle: BattleForVoting | null
  initialCategory?: CategoryFilter
  isDemo?: boolean
  onClose?: () => void
  showBack?: boolean
  onCommentOpen?: (open: boolean) => void
  viewerUserId?: string | null
}) {
  const router = useRouter()
  const t = useTranslations()
  const locale = useLocale()

  // ── 자동 번역 ──────────────────────────────────────────────────────────
  const [translated, setTranslated] = useState<{
    title: string
    descA: string | null
    descB: string | null
    description: string | null
  } | null>(null)

  // onClose 우선, 없으면 showBack 시 router.back()
  const handleClose = onClose ?? (showBack ? () => router.back() : undefined)

  const [battle, setBattle] = useState<BattleForVoting | null>(initialBattle)
  const [phase, setPhase] = useState<Phase>(initialBattle ? 'voting' : 'empty')
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null)
  const [touchesModalUserId, setTouchesModalUserId] = useState<string | null>(null)
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
  const likedMap = useRef<Map<string, boolean>>(new Map())
  const likeCountMap = useRef<Map<string, number>>(new Map())
  const [, setLikeStateVersion] = useState(0)
  const [likePending, setLikePending] = useState(false)

  // 현재 배틀의 좋아요 상태 (Map 우선, 없으면 배틀 원본값)
  const isLiked = battle ? (likedMap.current.get(battle.id) ?? battle.isLiked) : false
  const likeCount = battle ? (likeCountMap.current.get(battle.id) ?? battle.likeCount) : 0
  const [showHint, setShowHint] = useState(false)
  const [detailPhoto, setDetailPhoto] = useState<DetailPhoto | null>(null)
  const [historyStack, setHistoryStack] = useState<BattleForVoting[]>([])
  const [slideDir, setSlideDir] = useState<SlideDir>('none')
  const [barFilled, setBarFilled] = useState(false)
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)
  const [accuracyStatus, setAccuracyStatus] = useState<'loading' | 'done' | 'no-auth'>('loading')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [accuracyTotal, setAccuracyTotal] = useState(0)
  // 태그 검색
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<{ name: string; betterCount: number }[]>([])
  const tagInputRef = useRef<HTMLInputElement>(null)
  const tagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const swipeAxis = useRef<'none' | 'vertical' | 'horizontal'>('none')
  const [, startTransition] = useTransition()

  // ── 프리로드 ──────────────────────────────────────────────────────────
  const PREFETCH_SIZE = 3
  const prefetchQueue = useRef<BattleForVoting[]>([])
  const queuedIds = useRef<string[]>([])          // 큐에 있는 ID (중복 제외용)
  const isPrefetching = useRef(false)
  const seenIdsRef = useRef<string[]>(seenIds)    // seenIds 최신값 ref (async 클로저용)
  const categoryRef = useRef<CategoryFilter>(initialCategory)
  const tagFilterRef = useRef<string | null>(null)

  // ── 자동 번역 useEffect ────────────────────────────────────────────────
  useEffect(() => {
    setTranslated(null)
    if (!battle || locale === 'ko') return

    const texts = [
      battle.title,
      battle.isTextOnly ? (battle.imageAText ?? '') : (battle.imageADescription ?? ''),
      battle.isTextOnly ? (battle.imageBText ?? '') : (battle.imageBDescription ?? ''),
      battle.description ?? '',
    ]

    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, target: locale }),
    })
      .then((r) => r.json())
      .then(({ translations }: { translations: string[] }) => {
        setTranslated({
          title: translations[0] || battle.title,
          descA: translations[1] || battle.imageADescription,
          descB: translations[2] || battle.imageBDescription,
          description: translations[3] || battle.description || null,
        })
      })
      .catch(() => {}) // 실패 시 원문 유지
  }, [battle?.id, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  // 사유 입력 UI 열림/닫힘 → 부모에 전달
  useEffect(() => {
    const isOpen = phase === 'picked' || phase === 'submitting'
    onCommentOpen?.(isOpen)
  }, [phase, onCommentOpen])

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

  // 마운트 시 내가 좋아요한 배틀 ID 전체 로드 → 스와이프 후 돌아와도 상태 유지
  useEffect(() => {
    if (initialBattle) {
      if (!likeCountMap.current.has(initialBattle.id)) {
        likeCountMap.current.set(initialBattle.id, initialBattle.likeCount)
      }
    }
    getMyLikedBattleIds().then(ids => {
      ids.forEach(id => likedMap.current.set(id, true))
      setLikeStateVersion(v => v + 1)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 적중률 fetch
  function fetchAccuracy() {
    return fetch('/api/user/accuracy')
      .then(r => {
        if (r.status === 401) { setAccuracyStatus('no-auth'); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setAccuracy(data.accuracy)
        setAccuracyTotal(data.total)
        setAccuracyStatus('done')
      })
      .catch(() => setAccuracyStatus('no-auth'))
  }

  useEffect(() => { fetchAccuracy() }, [])

  // 태그 자동완성
  useEffect(() => {
    const q = tagInput.replace(/^#+/, '').trim()
    if (!q) { setTagSuggestions([]); return }
    if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current)
    tagDebounceRef.current = setTimeout(() => {
      fetch(`/api/tags/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then((data: { name: string; betterCount: number }[]) => setTagSuggestions(data))
        .catch(() => {})
    }, 200)
    return () => { if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current) }
  }, [tagInput])

  // 검색창 열릴 때 포커스
  useEffect(() => {
    if (searchOpen) setTimeout(() => tagInputRef.current?.focus(), 80)
    else { setTagInput(''); setTagSuggestions([]) }
  }, [searchOpen])

  function dismissHint() {
    setShowHint(false)
    try { localStorage.setItem('betterHintDone', '1') } catch {}
  }

  useEffect(() => {
    try { sessionStorage.setItem('seenBattleIds', JSON.stringify(seenIds)) } catch {}
  }, [seenIds])

  // 현재 카드 ID를 URL에 동기화 — 언어 변경 시 reload해도 같은 카드 유지
  useEffect(() => {
    if (!battle || typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('id', battle.id)
    window.history.replaceState(null, '', url.toString())
  }, [battle?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 퍼센트 바 채우기 애니메이션: voted가 되면 한 프레임 후 fill 트리거
  useEffect(() => {
    if (phase === 'voted') {
      const id = requestAnimationFrame(() => setBarFilled(true))
      return () => cancelAnimationFrame(id)
    }
    setBarFilled(false)
  }, [phase])

  // 투표 완료 3초 후 자동 다음 이동 (모달 모드에서는 비활성화)
  useEffect(() => {
    if (phase !== 'voted' || handleClose) return
    autoNextTimerRef.current = setTimeout(() => handleNext(), 3000)
    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // 백그라운드에서 다음 Better를 미리 로드
  async function fillPrefetchQueue() {
    if (isPrefetching.current) return
    if (prefetchQueue.current.length >= PREFETCH_SIZE) return
    isPrefetching.current = true
    try {
      while (prefetchQueue.current.length < PREFETCH_SIZE) {
        const cat = categoryRef.current !== 'all' ? categoryRef.current : undefined
        const excludeIds = [...seenIdsRef.current, ...queuedIds.current]
        const next = await getRandomBattle(excludeIds, cat, { tagName: tagFilterRef.current ?? undefined })
        if (!next) break
        prefetchQueue.current.push(next)
        queuedIds.current.push(next.id)
      }
    } finally {
      isPrefetching.current = false
    }
  }

  // 초기 마운트 시 프리로드 시작 (모달 모드에서는 스킵)
  useEffect(() => {
    if (initialBattle && !isDemo && !handleClose) fillPrefetchQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      // 참여 수 즉시 낙관적 업데이트 후 서버에서 정확한 값 재조회
      if (accuracyStatus === 'done') {
        setAccuracyTotal(prev => prev + 1)
        fetchAccuracy()
      }
    })
  }

  function loadNext(cat: CategoryFilter, currentSeenIds: string[], tag?: string | null) {
    setPhase('loading')
    startTransition(async () => {
      const c = cat !== 'all' ? cat : undefined
      const t = (tag !== undefined ? tag : tagFilterRef.current) ?? undefined
      const next = await getRandomBattle(currentSeenIds, c, { tagName: t })
      if (!next) {
        try { sessionStorage.removeItem('seenBattleIds') } catch {}
        setPhase('empty')
        return
      }
      const newSeenIds = [...currentSeenIds, next.id]
      seenIdsRef.current = newSeenIds
      setBattle(next)
      setSeenIds(newSeenIds)
      setSelectedChoice(null)
      setReason('')
      setVoteResult(null)
      setError(null)
      if (!likedMap.current.has(next.id)) likedMap.current.set(next.id, next.isLiked)
      if (!likeCountMap.current.has(next.id)) likeCountMap.current.set(next.id, next.likeCount)
      setPhase('voting')
      setSlideDir('enter-up')
      setTimeout(() => setSlideDir('none'), 300)
      if (!isDemo) fillPrefetchQueue()
    })
  }

  function handleNext() {
    if (battle) setHistoryStack(h => [...h.slice(-9), battle])

    const prefetched = prefetchQueue.current.shift()
    if (prefetched) {
      // 큐에서 제거된 ID를 queuedIds에서도 제거
      queuedIds.current = queuedIds.current.filter(id => id !== prefetched.id)
      // seenIds ref를 즉시 갱신 (다음 프리로드가 정확한 excludeIds 사용)
      const newSeenIds = [...seenIdsRef.current, prefetched.id]
      seenIdsRef.current = newSeenIds
      setSeenIds(newSeenIds)
      setBattle(prefetched)
      setSelectedChoice(null)
      setReason('')
      setVoteResult(null)
      setError(null)
      if (!likedMap.current.has(prefetched.id)) likedMap.current.set(prefetched.id, prefetched.isLiked)
      if (!likeCountMap.current.has(prefetched.id)) likeCountMap.current.set(prefetched.id, prefetched.likeCount)
      setPhase('voting')
      setSlideDir('enter-up')
      setTimeout(() => setSlideDir('none'), 300)
      // 소비된 만큼 큐를 다시 채움
      if (!isDemo) fillPrefetchQueue()
    } else {
      // 큐가 비어있으면 네트워크 로딩 (드문 케이스)
      loadNext(categoryRef.current, seenIdsRef.current)
    }
  }

  function handlePrev() {
    if (historyStack.length === 0) return
    const prev = historyStack[historyStack.length - 1]
    setHistoryStack(h => h.slice(0, -1))
    if (battle) setSeenIds(ids => ids.filter(id => id !== battle.id))
    setBattle(prev)
    setSelectedChoice(null)
    setReason('')
    setVoteResult(null)
    setError(null)
    setPhase('voting')
    setSlideDir('enter-down')
    setTimeout(() => setSlideDir('none'), 300)
  }

  function resetQueue() {
    prefetchQueue.current = []
    queuedIds.current = []
    isPrefetching.current = false
    setHistoryStack([])
    const fresh: string[] = []
    seenIdsRef.current = fresh
    setSeenIds(fresh)
    return fresh
  }

  function handleCategoryChange(newCat: CategoryFilter) {
    if (newCat === categoryFilter) return
    categoryRef.current = newCat
    setCategoryFilter(newCat)
    loadNext(newCat, resetQueue())
  }

  function handleTagChange(newTag: string | null) {
    tagFilterRef.current = newTag
    setTagFilter(newTag)
    setSearchOpen(false)
    loadNext(categoryRef.current, resetQueue(), newTag)
  }

  async function handleShare() {
    if (!battle) return
    const url = `${window.location.origin}/?id=${battle.id}`
    try {
      await navigator.share({ title: battle.title, url })
    } catch {
      try { await navigator.clipboard.writeText(url) } catch {}
    }
  }

  async function handleLike() {
    if (!battle || likePending) return
    const prevLiked = likedMap.current.get(battle.id) ?? battle.isLiked
    const prevCount = likeCountMap.current.get(battle.id) ?? battle.likeCount
    if (isDemo) {
      likedMap.current.set(battle.id, !prevLiked)
      likeCountMap.current.set(battle.id, prevLiked ? prevCount - 1 : prevCount + 1)
      setLikeStateVersion(v => v + 1)
      return
    }
    // 낙관적 업데이트
    likedMap.current.set(battle.id, !prevLiked)
    likeCountMap.current.set(battle.id, prevLiked ? prevCount - 1 : prevCount + 1)
    setLikeStateVersion(v => v + 1)
    setLikePending(true)
    const result = await toggleLike(battle.id)
    setLikePending(false)
    if ('error' in result) {
      // 롤백
      likedMap.current.set(battle.id, prevLiked)
      likeCountMap.current.set(battle.id, prevCount)
      setLikeStateVersion(v => v + 1)
    } else {
      likedMap.current.set(battle.id, result.isLiked)
      likeCountMap.current.set(battle.id, result.likeCount)
      setLikeStateVersion(v => v + 1)
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (searchOpen) return // 검색창 열려있으면 스와이프 차단
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipeAxis.current = 'none'
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (searchOpen) return
    if (swipeAxis.current === 'none') {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
      if (dx > 8 || dy > 8) {
        swipeAxis.current = dy > dx ? 'vertical' : 'horizontal'
      }
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (handleClose || searchOpen) return // 뒤로가기 모드 또는 검색창 열림: 스와이프 비활성화
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDy > absDx * 1.2 && absDy > 40) {
      e.stopPropagation()
      if (phase === 'submitting') return
      if (dy < 0) handleNext()
      else handlePrev()
    }
  }

  const pctA = voteResult && voteResult.total > 0
    ? Math.round((voteResult.votesA / voteResult.total) * 100) : 0
  const pctB = voteResult ? 100 - pctA : 0
  const isAWinning = voteResult ? voteResult.votesA > voteResult.votesB : false
  const isBWinning = voteResult ? voteResult.votesB > voteResult.votesA : false

  const slideStyle: React.CSSProperties =
    slideDir === 'enter-up'
      ? { animation: '_slideUp 0.3s ease-out' }
      : slideDir === 'enter-down'
        ? { animation: '_slideDown 0.3s ease-out' }
        : {}

  const dimA = (phase === 'picked' || phase === 'submitting') && selectedChoice === 'B'
  const dimB = (phase === 'picked' || phase === 'submitting') && selectedChoice === 'A'

  // voted 시 패배 쪽 어둡게, 승리 쪽 밝게
  const opacityA = dimA ? 0.45
    : phase === 'voted' && voteResult && !isAWinning ? 0.52
    : 1
  const opacityB = dimB ? 0.45
    : phase === 'voted' && voteResult && !isBWinning ? 0.52
    : 1

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#EDE4DA', userSelect: 'none' }}>
      <style>{`
        @keyframes _slideUp      { from { transform: translateY(60px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes _slideDown    { from { transform: translateY(-60px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes _slideUpModal { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes _checkPop     { 0% { transform: translate(-50%,-50%) scale(0); opacity:0 } 65% { transform: translate(-50%,-50%) scale(1.3); opacity:1 } 100% { transform: translate(-50%,-50%) scale(1); opacity:1 } }
        @keyframes bounceY       { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
      `}</style>

      {/* ── 정보 바 ── */}
      <div style={{
        height: 38, flexShrink: 0, zIndex: 20,
        background: 'rgba(237,228,218,0.97)',
        display: 'flex', alignItems: 'center',
        paddingLeft: 12, paddingRight: 10, gap: 0,
      }}>
        {/* 좌측: 태그 필터 활성 시 태그명 표시 / 아니면 레벨·적중률·참여 수 */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          {tagFilter ? (
            <span style={{ color: '#6366F1', fontSize: '0.73rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Hash size={10} strokeWidth={2.5} />
              {tagFilter} {t('vote.tagSearching')}
            </span>
          ) : accuracyStatus === 'no-auth' ? (
            <span style={{ color: 'rgba(61,43,31,0.5)', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
              {t('vote.loginPrompt')}
            </span>
          ) : accuracyStatus === 'loading' ? (
            <span style={{ color: 'rgba(61,43,31,0.4)', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
              {t('vote.loading')}
            </span>
          ) : (() => {
            const li = calcLevel(accuracyTotal, accuracy)
            const sep = <span style={{ color: 'rgba(61,43,31,0.25)', margin: '0 5px', fontSize: '0.875rem' }}>·</span>
            return (
              <>
                <span style={{ color: '#3D2B1F', fontSize: '0.875rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: '1rem' }}>{li.emoji}</span>
                  {t(`levels.${li.levelKey}` as Parameters<typeof t>[0])}
                </span>
                {sep}
                <span style={{ color: '#3D2B1F', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {accuracy !== null ? `${accuracy}%` : '-'}
                  <span style={{ color: 'rgba(61,43,31,0.4)', margin: '0 4px' }}>/</span>
                  {accuracyTotal}{t('participation.unit')}
                </span>
              </>
            )
          })()}
        </div>

        {/* 우측: 카테고리 드롭다운 + 검색 아이콘 */}
        {!handleClose && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* 카테고리 드롭다운 */}
            <div style={{ position: 'relative' }}>
              {catDropdownOpen && (
                <div
                  onClick={() => setCatDropdownOpen(false)}
                  onTouchEnd={() => setCatDropdownOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
                />
              )}
              <button
                onClick={e => { e.stopPropagation(); setCatDropdownOpen(prev => !prev) }}
                onTouchStart={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: catDropdownOpen ? 'rgba(61,43,31,0.15)' : 'rgba(61,43,31,0.08)',
                  border: `1px solid ${catDropdownOpen ? 'rgba(61,43,31,0.4)' : 'rgba(61,43,31,0.15)'}`,
                  borderRadius: 999, padding: '3px 10px',
                  cursor: 'pointer', color: '#3D2B1F',
                  fontSize: '0.875rem', fontWeight: 700,
                  position: 'relative', zIndex: 9991,
                }}
              >
                <span style={{ color: 'rgba(61,43,31,0.6)', fontWeight: 500 }}>{t('vote.category')}</span>
                <span style={{ maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {categoryFilter === 'all' ? t('categories.all') : t(`categories.${categoryFilter}` as Parameters<typeof t>[0])}
                </span>
                <ChevronDown size={12} style={{ flexShrink: 0, transform: catDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
              </button>
              {catDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 9999,
                  background: 'rgba(0,0,0,0.92)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: 12, minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}>
                  {CATEGORY_FILTERS.map(f => {
                    const isActive = categoryFilter === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={e => { e.stopPropagation(); handleCategoryChange(f.id); setCatDropdownOpen(false) }}
                        onTouchEnd={e => { e.stopPropagation(); handleCategoryChange(f.id); setCatDropdownOpen(false) }}
                        style={{
                          width: '100%', height: 44,
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '0 14px',
                          background: isActive ? 'rgba(99,102,241,0.25)' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1 }}>{f.emoji}</span>
                        <span style={{
                          flex: 1, fontSize: '0.85rem',
                          fontWeight: isActive ? 800 : 400,
                          color: isActive ? '#A5B4FC' : 'rgba(255,255,255,0.85)',
                        }}>
                          {f.id === 'all' ? t('categories.all') : t(`categories.${f.id}` as Parameters<typeof t>[0])}
                        </span>
                        {isActive && <Check size={14} style={{ color: '#A5B4FC', flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 🔍 / ✕ 태그 검색 토글 버튼 */}
            <button
              onClick={e => {
                e.stopPropagation()
                if (tagFilter) { handleTagChange(null); return }
                setSearchOpen(prev => !prev)
              }}
              onTouchStart={e => e.stopPropagation()}
              onTouchEnd={e => e.stopPropagation()}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: (searchOpen || tagFilter) ? 'rgba(61,43,31,0.15)' : 'rgba(61,43,31,0.08)',
                border: `1px solid ${(searchOpen || tagFilter) ? 'rgba(61,43,31,0.4)' : 'rgba(61,43,31,0.15)'}`,
                cursor: 'pointer', color: '#3D2B1F',
              }}
            >
              {tagFilter ? <X size={13} /> : <Search size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* ── 태그 검색 전체화면 오버레이 (portal → transform 조상 영향 차단) ── */}
      {searchOpen && !tagFilter && createPortal(
        <div
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            padding: '60px 16px 16px',
          }}
        >
          {/* 입력창 */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ color: '#666666', fontSize: '16px', flexShrink: 0 }}>🔍</span>
            <input
              ref={tagInputRef}
              autoFocus
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setSearchOpen(false)
                if (e.key === 'Enter' && tagSuggestions.length > 0) handleTagChange(tagSuggestions[0].name)
              }}
              placeholder={t('vote.tagSearchPlaceholder')}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
              }}
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666666', fontSize: '20px', lineHeight: 1, padding: 0 }}
            >×</button>
          </div>

          {/* 태그 목록 */}
          {tagSuggestions.length > 0 ? (
            <div style={{
              marginTop: '8px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              overflow: 'hidden',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}>
              {tagSuggestions.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleTagChange(s.name)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderBottom: i < tagSuggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: '#6366F1', fontSize: '14px', flexShrink: 0 }}>#</span>
                  <span style={{ flex: 1, color: '#000000', fontSize: '15px', fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: '#888888', fontSize: '12px' }}>{s.betterCount}{t('participation.unit')}</span>
                </button>
              ))}
            </div>
          ) : tagInput.replace(/^#+/, '').trim() ? (
            <div style={{ marginTop: '16px', textAlign: 'center', color: '#cccccc', fontSize: '14px' }}>
              {t('vote.tagNoMatch')}
            </div>
          ) : (
            <div style={{ marginTop: '16px', textAlign: 'center', color: '#aaaaaa', fontSize: '13px' }}>
              {t('vote.tagSearchPrompt')}
            </div>
          )}
        </div>,
        document.body,
      )}

      {/* ── 사진 영역 (터치 핸들러) ── */}
      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'pan-x' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >

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
              {t('hint.title')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                { icon: '↕️', text: t('hint.swipeVertical') },
                { icon: '↔️', text: t('hint.swipeHorizontal') },
                { icon: '👆', text: t('hint.tap') },
              ] as const).map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.82rem', lineHeight: 1.45 }}>{text}</span>
                </div>
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: 22 }}>{t('hint.dismiss')}</p>
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

      {/* ── 다음 카드 미리보기 ── */}
      {phase !== 'loading' && phase !== 'empty' && (
        <div
          onClick={phase !== 'submitting' ? handleNext : undefined}
          style={{
            position: 'absolute',
            bottom: 0, left: 16, right: 16,
            height: 50,
            background: '#ffffff',
            borderRadius: '12px 12px 0 0',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
            opacity: 0.6,
            transform: 'scale(0.94)',
            cursor: 'pointer',
          }}
        >
          {/* 스와이프 안내 오버레이 */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
          }}>
            <span style={{ color: 'rgba(61,43,31,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px' }}>
              {t('swipe.next')}
            </span>
            <span style={{ color: 'rgba(61,43,31,0.5)', fontSize: '14px', animation: 'bounceY 1.5s ease-in-out infinite', lineHeight: 1 }}>∧</span>
          </div>
        </div>
      )}

      {/* ── 폴라로이드 카드 ── */}
      <div style={{
        position: 'absolute',
        top: 8, left: 8, right: 8, bottom: 62,
        display: 'flex', flexDirection: 'column',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.12), 0 20px 40px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        background: 'white',
        ...slideStyle,
      }}>

        {/* ── 로딩 ── */}
        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
            <div style={{ height: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, margin: '0 6px', borderRadius: 4, background: '#1c1c1e' }} />
            <div style={{ height: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, margin: '0 6px', borderRadius: 4, background: '#161618' }} />
            <div style={{ height: 62, flexShrink: 0, background: '#f0ebe4', borderTop: '1px solid #EDE4DA' }} />
          </div>
        )}

        {/* ── Empty ── */}
        {phase === 'empty' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#ffffff', color: '#3D2B1F',
            textAlign: 'center', padding: 32,
          }}>
            {tagFilter ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏷️</div>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#3D2B1F' }}>
                  {t('vote.tagEmpty', { tag: tagFilter! })}
                </p>
                <p style={{ margin: '10px 0 0', color: '#9CA3AF', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {t('vote.tagEmptyDesc')}
                </p>
                <button
                  onClick={() => handleTagChange(null)}
                  style={{
                    marginTop: 20, padding: '8px 20px', borderRadius: 999,
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.4)',
                    color: '#6366F1', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {t('vote.clearTagFilter')}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>🎉</div>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#3D2B1F' }}>{t('vote.allSeen')}</p>
                <p style={{ margin: '10px 0 0', color: '#9CA3AF', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {t('vote.allSeenDesc')}
                </p>
              </>
            )}
          </div>
        )}

        {/* ── 메인 콘텐츠 ── */}
        {phase !== 'loading' && phase !== 'empty' && battle && (
          <>
            {/* ── 사진 섹션 ── */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column' }}>

              {/* 상단 폴라로이드 여백 */}
              <div style={{ height: 8, flexShrink: 0 }} />

              {/* 사진 A (상단) */}
              <div
                onClick={phase === 'voting' ? () => handlePickPhoto('A') : undefined}
                style={{
                  flex: 1,
                  marginLeft: 6, marginRight: 6,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 4,
                  cursor: phase === 'voting' ? 'pointer' : 'default',
                  opacity: opacityA,
                  filter: !dimA && (phase === 'picked' || phase === 'submitting') && selectedChoice === 'A'
                    ? 'brightness(1.18)'
                    : phase === 'voted' && isAWinning ? 'brightness(1.08)' : undefined,
                  transition: 'opacity 0.5s, filter 0.5s',
                }}
              >
                {battle.isTextOnly ? (
                  <TextCard
                    text={translated?.descA ?? battle.imageAText ?? ''}
                    colorIdx={getTextColorIdx(battle.id, 0)}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={battle.imageAUrl}
                    alt="A"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
                  />
                )}
                {/* A 배지 */}
                <div style={{
                  position: 'absolute', bottom: 10, left: 10, zIndex: 3,
                  background: '#3D2B1F', color: 'white',
                  fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: 4,
                }}>A</div>

                {/* 설명 텍스트 */}
                {!battle.isTextOnly && (translated?.descA ?? battle.imageADescription) && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
                    padding: '8px 12px',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    color: '#ffffff', fontSize: '0.875rem', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    A. {translated?.descA ?? battle.imageADescription}
                  </div>
                )}

                {/* 선택됨 오버레이 */}
                {(phase === 'picked' || phase === 'submitting') && selectedChoice === 'A' && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.22)', pointerEvents: 'none' }} />
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      background: '#6366F1', borderRadius: '50%',
                      width: 52, height: 52,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 28px rgba(99,102,241,0.75)',
                      animation: '_checkPop 0.38s cubic-bezier(0.25,1,0.5,1) forwards',
                    }}>
                      <Check size={26} color="white" strokeWidth={3} />
                    </div>
                  </>
                )}

                {/* 투표 결과 오버레이 */}
                {phase === 'voted' && voteResult && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: isAWinning ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.5)', transition: 'background 0.5s' }} />
                    <div style={{ position: 'absolute', top: 8, left: 10, right: 10, zIndex: 4, display: 'flex', gap: 6 }}>
                      {selectedChoice === 'A' && (
                        <span style={{ background: '#6366F1', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{t('vote.myChoice')}</span>
                      )}
                      {isAWinning && (
                        <span style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{t('vote.leading')}</span>
                      )}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: barFilled ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                      <p style={{ margin: 0, color: 'white', lineHeight: 1, fontSize: isAWinning ? '3.5rem' : '2.6rem', fontWeight: 900, textShadow: isAWinning ? '0 2px 20px rgba(99,102,241,0.6)' : '0 2px 8px rgba(0,0,0,0.6)', transition: 'font-size 0.4s' }}>{pctA}%</p>
                      <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600 }}>{t('vote.votesCount', { count: voteResult.votesA })}</p>
                    </div>
                  </>
                )}
              </div>

              {/* A/B 사이 흰색 여백 (6px) */}
              <div style={{ height: 6, flexShrink: 0 }} />

              {/* 사진 B (하단) */}
              <div
                onClick={phase === 'voting' ? () => handlePickPhoto('B') : undefined}
                style={{
                  flex: 1,
                  marginLeft: 6, marginRight: 6,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 4,
                  cursor: phase === 'voting' ? 'pointer' : 'default',
                  opacity: opacityB,
                  filter: !dimB && (phase === 'picked' || phase === 'submitting') && selectedChoice === 'B'
                    ? 'brightness(1.18)'
                    : phase === 'voted' && isBWinning ? 'brightness(1.08)' : undefined,
                  transition: 'opacity 0.5s, filter 0.5s',
                }}
              >
                {battle.isTextOnly ? (
                  <TextCard
                    text={translated?.descB ?? battle.imageBText ?? ''}
                    colorIdx={getTextColorIdx(battle.id, 1)}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={battle.imageBUrl}
                    alt="B"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
                  />
                )}
                {/* B 배지 */}
                <div style={{
                  position: 'absolute', bottom: 10, left: 10, zIndex: 3,
                  background: '#D4C4B0', color: '#3D2B1F',
                  fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: 4,
                }}>B</div>

                {/* 설명 텍스트 */}
                {!battle.isTextOnly && (translated?.descB ?? battle.imageBDescription) && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
                    padding: '8px 12px',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    color: '#ffffff', fontSize: '0.875rem', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    B. {translated?.descB ?? battle.imageBDescription}
                  </div>
                )}

                {/* 선택됨 오버레이 */}
                {(phase === 'picked' || phase === 'submitting') && selectedChoice === 'B' && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.22)', pointerEvents: 'none' }} />
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      background: '#6366F1', borderRadius: '50%',
                      width: 52, height: 52,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 28px rgba(99,102,241,0.75)',
                      animation: '_checkPop 0.38s cubic-bezier(0.25,1,0.5,1) forwards',
                    }}>
                      <Check size={26} color="white" strokeWidth={3} />
                    </div>
                  </>
                )}

                {/* 투표 결과 오버레이 */}
                {phase === 'voted' && voteResult && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: isBWinning ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.5)', transition: 'background 0.5s' }} />
                    <div style={{ position: 'absolute', top: 8, left: 10, right: 10, zIndex: 4, display: 'flex', gap: 6 }}>
                      {selectedChoice === 'B' && (
                        <span style={{ background: '#6366F1', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{t('vote.myChoice')}</span>
                      )}
                      {isBWinning && (
                        <span style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{t('vote.leading')}</span>
                      )}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: barFilled ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                      <p style={{ margin: 0, color: 'white', lineHeight: 1, fontSize: isBWinning ? '3.5rem' : '2.6rem', fontWeight: 900, textShadow: isBWinning ? '0 2px 20px rgba(99,102,241,0.6)' : '0 2px 8px rgba(0,0,0,0.6)', transition: 'font-size 0.4s' }}>{pctB}%</p>
                      <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600 }}>{t('vote.votesCount', { count: voteResult.votesB })}</p>
                    </div>
                  </>
                )}
              </div>

              {/* ── VS 오버레이 (사진 A/B 사이 중앙) ── */}
              <div style={{ position: 'absolute', top: 'calc(50% + 4px)', left: 6, right: 6, transform: 'translateY(-50%)', zIndex: 5, pointerEvents: 'none' }}>
                {phase === 'voted' && voteResult ? (
                  <div style={{ position: 'relative', height: 36, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: barFilled ? `${pctA}%` : '0%', background: 'linear-gradient(to right, #4338CA, #6366F1)', transition: 'width 0.75s cubic-bezier(0.25,1,0.5,1)' }} />
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: barFilled ? `${pctB}%` : '0%', background: 'linear-gradient(to left, #BE185D, #EC4899)', transition: 'width 0.75s cubic-bezier(0.25,1,0.5,1)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: '0.92rem', textShadow: '0 1px 6px rgba(0,0,0,0.8)', letterSpacing: '-0.02em' }}>A&nbsp;&nbsp;{pctA}%</span>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: '0.92rem', textShadow: '0 1px 6px rgba(0,0,0,0.8)', letterSpacing: '-0.02em' }}>{pctB}%&nbsp;&nbsp;B</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.15)', zIndex: 3 }}>
                      <div style={{ height: '100%', width: barFilled ? '0%' : '100%', background: 'rgba(255,255,255,0.55)', transition: barFilled ? 'width 2.9s linear' : 'none' }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ffffff', border: '1.5px solid #D4C4B0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9B8B7E', fontWeight: 900, fontSize: '0.62rem', letterSpacing: '0.05em', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>VS</div>
                  </div>
                )}
              </div>

              {/* ── 뒤로가기 버튼 (handleClose 모드) ── */}
              {handleClose && (
                <button
                  onClick={handleClose}
                  style={{
                    position: 'absolute', top: 24, left: 22, zIndex: 35,
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={18} color="white" />
                </button>
              )}

              {/* ── 우측 액션 버튼 ── */}
              <div style={{
                position: 'absolute', right: 22, top: '58%', transform: 'translateY(-50%)',
                zIndex: 25,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                <button
                  onClick={e => { e.stopPropagation(); handleLike() }}
                  disabled={likePending}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: likePending ? 0.6 : 1 }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Heart size={18} style={{ fill: isLiked ? '#F43F5E' : 'transparent', stroke: isLiked ? '#F43F5E' : 'white', transition: 'all 0.15s' }} />
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1 }}>{likeCount}</span>
                </button>

                <button
                  onClick={e => { e.stopPropagation(); handleShare() }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Share2 size={18} color="white" />
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1 }}>{t('vote.share')}</span>
                </button>
              </div>

              {/* ── 투표 완료: 이전 / 다음 ── */}
              {phase === 'voted' && (
                handleClose ? (
                  <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 35, display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={handleClose}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('vote.backToList')}
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 35, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
                    <button
                      onClick={handlePrev}
                      disabled={historyStack.length === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: historyStack.length === 0 ? 0.3 : 1 }}
                    >
                      <ChevronUp size={15} /> {t('vote.prevButton')}
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>{t('swipe.up')}</span>
                    <button
                      onClick={handleNext}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.45)' }}
                    >
                      {t('vote.nextButton')} <ChevronRight size={15} />
                    </button>
                  </div>
                )
              )}

            </div>{/* 사진 섹션 끝 */}

            {/* ── 폴라로이드 하단 흰색 정보 바 ── */}
            <div style={{ flexShrink: 0, background: '#ffffff', padding: '8px 10px 10px', maxHeight: 70, overflow: 'hidden' }}>
              {(() => {
                const cat = CATEGORY_MAP[battle.category]
                const badge = CAT_BADGE[battle.category]
                return (
                  <>
                    {/* 카테고리 + AI 배지 + 작성자 (한 줄) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: badge.bg, color: badge.text, fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        {cat.emoji} {t(`categories.${battle.category}` as Parameters<typeof t>[0])}
                      </span>
                      {translated && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontSize: '11px', fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>✦ AI</span>
                      )}
                      <div style={{ flex: 1 }} />
                      {battle.author && (
                        <button
                          onClick={() => setProfileModalUserId(battle.author!.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {battle.author.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={battle.author.avatarUrl} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{
                              width: 18, height: 18, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.5rem', fontWeight: 900, color: 'white',
                            }}>
                              {battle.author.displayName[0]?.toUpperCase() ?? '?'}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#3D2B1F', maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {battle.author.displayName}
                          </span>
                          {battle.author.country && (
                            <span style={{ fontSize: '11px', lineHeight: 1 }}>{countryToFlag(battle.author.country)}</span>
                          )}
                        </button>
                      )}
                    </div>
                    {/* 제목 (한 줄, 넘치면 폰트 축소) */}
                    <FitTitle text={translated?.title ?? battle.title} />
                    {phase === 'voting' && battle.description ? (
                      <p style={{
                        margin: '2px 0 0', fontSize: '11px', color: '#666666', fontWeight: 400,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4',
                      }}>
                        {translated?.description ?? battle.description}
                      </p>
                    ) : (
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9CA3AF', fontWeight: 500 }}>
                        {(phase === 'picked' || phase === 'submitting') && t('vote.addReasonOptional')}
                        {phase === 'voted' && t('vote.voteDone')}
                      </p>
                    )}
                  </>
                )
              })()}
            </div>

            {/* ── 투표 이유 입력 바텀시트 (picked / submitting) ── */}
            {(phase === 'picked' || phase === 'submitting') && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '20px 20px 0 0',
                padding: '12px 16px 28px',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
                animation: '_slideUpModal 0.25s cubic-bezier(0.25,1,0.5,1)',
              }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: '#E5E7EB', margin: '0 auto 12px' }} />
                {error && (
                  <p style={{ color: '#EF4444', fontSize: '0.85rem', margin: '0 0 8px' }}>{error}</p>
                )}
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>
                  {t('vote.reasonLabel', { choice: selectedChoice ?? '' })}
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('vote.reasonPlaceholder')}
                  maxLength={200}
                  rows={2}
                  disabled={phase === 'submitting'}
                  style={{
                    width: '100%', resize: 'none', borderRadius: 12,
                    border: '1px solid #E5E7EB', background: '#F9FAFB',
                    padding: '10px 12px', fontSize: '0.9rem', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    onClick={handleCancel}
                    disabled={phase === 'submitting'}
                    style={{ padding: '9px 18px', borderRadius: 12, border: '1px solid #E5E7EB', background: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >{t('vote.cancel')}</button>
                  <button
                    onClick={handleSubmit}
                    disabled={phase === 'submitting'}
                    style={{ padding: '9px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {phase === 'submitting' ? t('vote.submitting') : t('vote.submit')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>{/* ── 폴라로이드 카드 끝 ── */}
      </div>{/* ── 사진 영역 끝 ── */}

      {profileModalUserId && (
        <UserProfileModal
          userId={profileModalUserId}
          viewerUserId={viewerUserId}
          onClose={() => setProfileModalUserId(null)}
          onViewTouches={(id) => setTouchesModalUserId(id)}
        />
      )}
      {touchesModalUserId && (
        <UserTouchesModal
          userId={touchesModalUserId}
          viewerUserId={viewerUserId}
          onClose={() => setTouchesModalUserId(null)}
        />
      )}
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
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100dvh',
        background: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        animation: '_slideUpModal 0.32s cubic-bezier(0.25,1,0.5,1)',
      }}
    >
      {/* 상단 바 — 56px 고정 */}
      <div style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: 8,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <X size={24} color="white" />
        </button>
      </div>

      {/* 사진 영역 */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100dvh - 56px)',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={side}
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain', objectPosition: 'center',
            display: 'block',
          }}
        />

        {description && (
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            padding: '20px 20px 36px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}>
            <p style={{
              margin: 0, color: 'white',
              fontSize: '0.9rem', lineHeight: 1.6,
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
