'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
  votesA: number
  votesB: number
  total: number
  reasons: { choice: 'A' | 'B'; reason: string }[]
  createdAt: Date
  closedAt: Date | null
  winner: 'A' | 'B' | null
  likesCount: number
  category: BetterCategory
}

export function ProfileBetterList({ battles }: { battles: BattleWithStats[] }) {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const t = useTranslations()

  const handleDeleteSuccess = (id: string) =>
    setDeletedIds(prev => new Set([...prev, id]))

  const visible = battles.filter(b => !deletedIds.has(b.id))
  const filtered = filter === 'all' ? visible : visible.filter((b) => b.category === filter)

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
        <div className="mb-3 text-4xl">📸</div>
        <p className="font-bold">{t('profile.noBettersYet')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('profile.noBettersDesc')}</p>
        <Link
          href="/battles/new"
          className="mt-6 rounded-2xl px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          {t('profile.createFirstBetter')}
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
            {f.emoji} {f.id === 'all' ? t('categories.all') : t(`categories.${f.id}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-14 text-center">
          <div className="mb-2 text-3xl">
            {CATEGORY_FILTERS.find((f) => f.id === filter)?.emoji ?? '📂'}
          </div>
          <p className="text-sm font-semibold">{t('profile.noCategoryBetters')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((battle) => (
            <MyBetterCard
              key={battle.id}
              battle={battle}
              onDeleteSuccess={handleDeleteSuccess}
            />
          ))}
        </div>
      )}
    </div>
  )
}
