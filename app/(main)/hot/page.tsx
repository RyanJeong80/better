import Link from 'next/link'
import { Heart, Flame } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { betters, likes } from '@/lib/db/schema'
import { CATEGORY_FILTERS, CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'


type HotEntry = {
  id: string
  title: string
  imageAUrl: string
  imageBUrl: string
  likeCount: number
  category: BetterCategory
}

const RANK_STYLE: Record<number, { bg: string; text: string }> = {
  1: { bg: '#FEF3C7', text: '#D97706' },
  2: { bg: '#F3F4F6', text: '#6B7280' },
  3: { bg: '#FDE8D8', text: '#92400E' },
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

export const revalidate = 30 // 30초 캐시 — Hot 순위는 실시간 불필요

export default async function HotPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategory: CategoryFilter =
    (CATEGORY_FILTERS.find((f) => f.id === category)?.id) ?? 'all'

  const t = await getTranslations()

  let entries: HotEntry[] = []

  try {
    const [allBetters, allLikes] = await Promise.all([
      db.select({
        id: betters.id,
        title: betters.title,
        imageAUrl: betters.imageAUrl,
        imageBUrl: betters.imageBUrl,
        category: betters.category,
      }).from(betters),
      db.select({ betterId: likes.betterId }).from(likes),
    ])

    const likeCountMap = new Map<string, number>()
    for (const l of allLikes) {
      likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
    }

    entries = allBetters
      .map((b) => ({ ...b, likeCount: likeCountMap.get(b.id) ?? 0 }))
      .filter((b) => b.likeCount > 0)
      .filter((b) => activeCategory === 'all' || b.category === activeCategory)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 100)
  } catch (e) {
    const pg = e as Record<string, unknown>
    console.error('[HotPage] DB error:', { message: pg.message, code: pg.code, detail: pg.detail, hint: pg.hint })
    entries = []
  }

  return (
    <div className="space-y-6">

      {/* 헤더 */}
      <div
        className="flex items-center gap-4 rounded-3xl px-6 py-6"
        style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', border: '1px solid #FDE68A' }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
        >
          <Flame size={28} color="white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">Hot 100 Touched</h2>
          <p className="mt-0.5 text-sm text-amber-700">{t('hot.subtitle100')}</p>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {CATEGORY_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'all' ? '/hot' : `/hot?category=${f.id}`}
            style={{ fontSize: '11px' }}
            className={[
              'rounded-full px-1.5 py-1 text-center font-semibold transition-all',
              activeCategory === f.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {f.emoji} {f.id === 'all' ? t('categories.all') : t(`categories.${f.id}` as Parameters<typeof t>[0])}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
          <div className="mb-3 text-4xl">🔥</div>
          <p className="font-bold">{t('hot.noLikes')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('hot.noLikesDesc')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {entries.map((entry, i) => {
              const rank = i + 1
              const rankStyle = RANK_STYLE[rank]
              const cat = CATEGORY_MAP[entry.category]
              const catStyle = CAT_BADGE[entry.category]

              return (
                <li key={entry.id}>
                  <Link href={`/battles/${entry.id}`} className="flex items-center gap-3 px-4 py-3 md:px-5 md:py-3.5 hover:bg-accent transition-colors">
                    {/* 순위 뱃지 */}
                    {rankStyle ? (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                        style={{ background: rankStyle.bg, color: rankStyle.text }}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="w-7 shrink-0 text-center text-sm font-bold text-muted-foreground">
                        {rank}
                      </span>
                    )}

                    {/* 카테고리 배지 */}
                    <span
                      className="hidden shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex"
                      style={{ background: catStyle.bg, color: catStyle.text }}
                    >
                      {cat.emoji} {t(`categories.${entry.category}` as Parameters<typeof t>[0])}
                    </span>

                    {/* 미리보기 이미지 */}
                    <div className="flex shrink-0 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.imageAUrl} alt="A" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.imageBUrl} alt="B" style={{ width: 40, height: 40, objectFit: 'cover', borderLeft: '2px solid var(--color-background)' }} />
                    </div>

                    {/* 제목 */}
                    <span className="flex-1 truncate text-sm font-semibold">{entry.title}</span>

                    {/* 좋아요 */}
                    <div
                      className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1"
                      style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}
                    >
                      <Heart size={12} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                      <span className="text-xs font-bold tabular-nums" style={{ color: '#F43F5E' }}>
                        {entry.likeCount}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
