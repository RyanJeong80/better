'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Flame, ArrowUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'
import type { PanelHotEntry } from '@/app/api/panels/hot/route'

const CAT_COLOR: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#DBEAFE', text: '#1D4ED8' },
  appearance: { bg: '#FCE7F3', text: '#9D174D' },
  love:       { bg: '#FFE4E6', text: '#BE123C' },
  shopping:   { bg: '#FEF3C7', text: '#B45309' },
  food:       { bg: '#FFEDD5', text: '#C2410C' },
  it:         { bg: '#EDE9FE', text: '#6D28D9' },
  decision:   { bg: '#DCFCE7', text: '#15803D' },
}

const RANK_STYLE: Record<number, { bg: string; color: string }> = {
  1: { bg: '#F59E0B', color: 'white' },
  2: { bg: '#9CA3AF', color: 'white' },
  3: { bg: '#B45309', color: 'white' },
}

type SortOrder = 'popular' | 'recent'

type CategoryTabKey = CategoryFilter

const CATEGORY_TAB_KEYS: CategoryTabKey[] = [
  'all', 'fashion', 'appearance', 'love', 'shopping', 'food', 'it', 'decision',
]

function SkeletonItem() {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ paddingTop: '56.25%', borderRadius: 12, background: 'var(--color-muted)', position: 'relative', overflow: 'hidden' }} className="animate-pulse" />
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, borderRadius: 4, background: 'var(--color-muted)', marginBottom: 6 }} className="animate-pulse" />
          <div style={{ height: 14, borderRadius: 4, background: 'var(--color-muted)', width: '75%', marginBottom: 6 }} className="animate-pulse" />
          <div style={{ height: 11, borderRadius: 4, background: 'var(--color-muted)', width: '40%' }} className="animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '12px 12px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
        <div style={{ width: 140, height: 18, borderRadius: 6, background: 'var(--color-muted)' }} className="animate-pulse" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)}
    </div>
  )
}

const PAGE_SIZE = 10

export function HotPanelClient({
  onSelectBattle,
}: {
  onSelectBattle?: (entry: PanelHotEntry) => void
}) {
  const t = useTranslations()
  const [entries, setEntries] = useState<PanelHotEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('popular')
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/panels/hot')
      .then(r => r.json())
      .then((data: PanelHotEntry[]) => { setEntries(data); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [])

  const filtered = useMemo(() => {
    const base = category === 'all' ? entries : entries.filter(e => e.category === category)
    if (sortOrder === 'recent') {
      return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return [...base].sort((a, b) => b.likeCount - a.likeCount)
  }, [entries, category, sortOrder])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [category, sortOrder])

  useEffect(() => {
    if (status !== 'done' || visibleCount >= filtered.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [status, visibleCount, filtered.length])

  if (status === 'loading') return <Skeleton />

  const tabLabel = (key: CategoryTabKey) =>
    key === 'all'
      ? t('categories.all')
      : t(`categories.${key}Short` as Parameters<typeof t>[0])

  const categoryLabel = (key: CategoryFilter) =>
    key === 'all'
      ? t('categories.all')
      : t(`categories.${key}` as Parameters<typeof t>[0])

  return (
    <div style={{ padding: '12px 12px 40px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame size={18} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>Hot Touched</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', margin: '2px 0 0' }}>
            {t('hot.subtitle')}
          </p>
        </div>
        {/* 정렬 토글 */}
        <button
          onClick={() => setSortOrder(prev => prev === 'popular' ? 'recent' : 'popular')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'var(--color-muted)',
            border: 'none', cursor: 'pointer',
            borderRadius: 999, padding: '5px 10px',
            fontSize: '0.72rem', fontWeight: 700,
            color: 'var(--color-foreground)',
            flexShrink: 0,
          }}
        >
          <ArrowUpDown size={11} />
          {sortOrder === 'popular' ? t('hot.popular') : t('hot.recent')}
        </button>
      </div>

      {/* 카테고리 필터 탭 */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16,
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {CATEGORY_TAB_KEYS.map(key => {
          const active = category === key
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              style={{
                flexShrink: 0,
                padding: '5px 12px',
                borderRadius: 999,
                border: active ? 'none' : '1.5px solid var(--color-border)',
                background: active ? '#F59E0B' : 'transparent',
                color: active ? 'white' : 'var(--color-muted-foreground)',
                fontSize: '0.75rem', fontWeight: active ? 800 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tabLabel(key)}
            </button>
          )
        })}
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 16, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔥</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>{t('hot.noLikes')}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            {t('hot.noLikesDesc')}
          </p>
        </div>
      ) : (
        <div>
          {filtered.slice(0, visibleCount).map((entry, i) => {
            const rank = i + 1
            const cat = CATEGORY_MAP[entry.category]
            const catColor = CAT_COLOR[entry.category]
            const rankStyle = RANK_STYLE[rank]

            return (
              <div
                key={entry.id}
                onClick={() => onSelectBattle?.(entry)}
                style={{ display: 'block', marginBottom: 20, cursor: 'pointer' }}
              >
                {/* 썸네일 */}
                <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageAUrl}
                      alt="A"
                      style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'relative', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 1, height: '100%', position: 'absolute', background: 'rgba(255,255,255,0.25)' }} />
                      <span style={{
                        position: 'relative', zIndex: 1,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(6px)',
                        color: 'white', fontSize: '0.55rem', fontWeight: 900,
                        padding: '3px 5px', borderRadius: 6,
                        letterSpacing: '0.04em',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}>VS</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageBUrl}
                      alt="B"
                      style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>

                  {/* 순위 배지 */}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    background: rankStyle ? rankStyle.bg : 'rgba(0,0,0,0.7)',
                    color: rankStyle ? rankStyle.color : 'white',
                    fontSize: rank > 9 ? '0.62rem' : '0.7rem',
                    fontWeight: 900,
                    minWidth: 24, height: 24,
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}>
                    {rank}
                  </div>

                  {/* 좋아요 수 */}
                  <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: 6,
                    padding: '3px 7px',
                  }}>
                    <Heart size={11} style={{ fill: '#F43F5E', stroke: '#F43F5E', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'white' }}>
                      {entry.likeCount}
                    </span>
                  </div>
                </div>

                {/* 정보 영역 */}
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: catColor.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    {cat.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.4,
                      color: 'var(--color-foreground)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {entry.title}
                    </p>
                    <p style={{
                      margin: '4px 0 0',
                      fontSize: '0.75rem', color: 'var(--color-muted-foreground)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: catColor.bg, color: catColor.text,
                        padding: '1px 7px', borderRadius: 999,
                        fontSize: '0.68rem', fontWeight: 700,
                      }}>
                        {t(`categories.${entry.category}` as Parameters<typeof t>[0])}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Heart size={10} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                        {entry.likeCount}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          {/* 스크롤 sentinel + 로딩 인디케이터 */}
          {visibleCount < filtered.length ? (
            <div ref={sentinelRef} style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#F59E0B',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-foreground)' }}>
                {t('hot.viewConfirmed', { category: categoryLabel(category), count: filtered.length })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
