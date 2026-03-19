'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'
import { MyBetterCard } from '@/components/battles/my-better-card'

export interface BattleWithStats {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  votesA: number
  votesB: number
  total: number
  reasons: { choice: 'A' | 'B'; reason: string }[]
  createdAt: Date
  likesCount: number
  category: BetterCategory
}

export function ProfileBetterList({ battles }: { battles: BattleWithStats[] }) {
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const filtered = filter === 'all' ? battles : battles.filter((b) => b.category === filter)

  if (battles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
        <div className="mb-3 text-4xl">📸</div>
        <p className="font-bold">아직 Better가 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">두 사진을 올리고 사람들의 선택을 받아보세요</p>
        <Link
          href="/battles/new"
          className="mt-6 rounded-2xl px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          첫 Better 만들기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 카테고리 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              filter === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-14 text-center">
          <div className="mb-2 text-3xl">
            {CATEGORY_FILTERS.find((f) => f.id === filter)?.emoji ?? '📂'}
          </div>
          <p className="text-sm font-semibold">이 카테고리의 Better가 없어요</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((battle) => (
            <MyBetterCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}
    </div>
  )
}
