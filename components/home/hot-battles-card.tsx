'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Heart } from 'lucide-react'
import { CATEGORY_FILTERS, CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'

type HotThumb = {
  id: string
  title: string
  imageAUrl: string
  imageBUrl: string
  category: BetterCategory
  likeCount: number
}

export function HotBattlesCard({ initialBattles }: { initialBattles: HotThumb[] }) {
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const filtered = filter === 'all'
    ? initialBattles
    : initialBattles.filter((b) => b.category === filter)

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#FFFBEB' }}>
          <Flame size={20} color="#F59E0B" />
        </div>
        <h3 className="font-bold text-lg">Hot 100 Better</h3>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.375rem' }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{ fontSize: '11px' }}
            className={[
              'rounded-full px-1 py-0.5 font-semibold transition-all',
              filter === f.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'border border-border text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <ul className="flex-1 space-y-2.5">
        {filtered.slice(0, 5).map((b, i) => (
          <li key={b.id} className="flex items-center gap-2">
            <span
              className="w-5 shrink-0 text-center text-sm font-black"
              style={{ color: i === 0 ? '#D97706' : i === 1 ? '#9CA3AF' : '#B45309' }}
            >
              {i + 1}
            </span>
            <span className="shrink-0 text-sm">{CATEGORY_MAP[b.category].emoji}</span>
            <div className="flex shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageAUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageBUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderLeft: '2px solid #FFFBEB' }} />
            </div>
            <span className="flex-1 truncate text-lg text-muted-foreground">{b.title}</span>
            <div className="flex shrink-0 items-center gap-0.5" style={{ color: '#F43F5E' }}>
              <Heart size={10} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
              <span className="text-xs font-bold">{b.likeCount}</span>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-4 text-center text-xs text-muted-foreground">아직 데이터가 없어요</li>
        )}
      </ul>

      {/* 푸터 */}
      <Link
        href={filter === 'all' ? '/hot' : `/hot?category=${filter}`}
        className="mt-auto text-xs font-bold"
        style={{ color: '#F59E0B' }}
      >
        전체 보기 →
      </Link>
    </div>
  )
}
