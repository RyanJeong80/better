'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Shuffle } from 'lucide-react'
import { getBattleThumbnails, type BattleThumb } from '@/actions/battles'
import { CATEGORY_FILTERS, CATEGORY_MAP } from '@/lib/constants/categories'
import type { CategoryFilter } from '@/lib/constants/categories'

export function RandomBattlesCard({
  initialBattles,
  initialOffset,
}: {
  initialBattles: BattleThumb[]
  initialOffset: number
}) {
  const [battles, setBattles] = useState(initialBattles)
  const [offset, setOffset] = useState(initialOffset)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [isPending, startTransition] = useTransition()

  function fetchBattles(cat: CategoryFilter, fromOffset: number) {
    const category = cat === 'all' ? undefined : cat
    startTransition(async () => {
      const next = await getBattleThumbnails(fromOffset, category)
      if (next.length > 0) {
        setBattles(next)
        setOffset(fromOffset + 10)
      }
    })
  }

  function handleCategoryChange(cat: CategoryFilter) {
    setFilter(cat)
    fetchBattles(cat, 0)
  }

  function handleNext() {
    fetchBattles(filter, offset)
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#EEF2FF' }}>
          <Shuffle size={20} color="#6366F1" />
        </div>
        <h3 className="font-bold text-base">랜덤 Better 보기</h3>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem' }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => handleCategoryChange(f.id)}
            className={[
              'rounded-full px-1.5 py-1 text-xs font-semibold transition-all',
              filter === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* 썸네일 목록 */}
      <ul className={`flex-1 space-y-1.5 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
        {battles.map((b) => (
          <li key={b.id}>
            <Link
              href={`/explore?id=${b.id}`}
              className="flex items-center gap-2.5 rounded-xl px-1 py-0.5 -mx-1 hover:bg-accent transition-colors"
            >
              <span className="shrink-0 text-sm">{CATEGORY_MAP[b.category].emoji}</span>
              <div className="flex shrink-0 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageAUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageBUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderLeft: '2px solid hsl(var(--card))' }} />
              </div>
              <span className="truncate text-sm text-muted-foreground">{b.title}</span>
            </Link>
          </li>
        ))}
        {battles.length === 0 && !isPending && (
          <li className="py-4 text-center text-xs text-muted-foreground">아직 데이터가 없어요</li>
        )}
      </ul>

      {/* 푸터 */}
      <div className="flex items-center justify-between">
        <Link
          href={filter === 'all' ? '/explore' : `/explore?category=${filter}`}
          className="text-xs font-bold"
          style={{ color: '#6366F1' }}
        >
          탐색하기 →
        </Link>
        <button
          onClick={handleNext}
          disabled={isPending}
          className="text-xs font-bold transition-opacity disabled:opacity-40"
          style={{ color: '#6366F1' }}
        >
          {isPending ? '로딩 중…' : '다음 10개 →'}
        </button>
      </div>
    </div>
  )
}
