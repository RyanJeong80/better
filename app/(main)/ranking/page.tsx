import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes, users, betters } from '@/lib/db/schema'
import { RankingView, type RankEntry, type MyStats } from '@/components/ranking/ranking-view'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'

// ─── 순위 계산 ─────────────────────────────────────────────────────
async function buildRankingData(
  currentUserId?: string,
  categoryFilter: CategoryFilter = 'all',
): Promise<{
  myStats: MyStats | null
  participationRanking: RankEntry[]
  accuracyRanking: RankEntry[]
}> {

  // votes + betters(winner, category) + users 조인
  // betters.winner = 확정 winner ('A'|'B'|null)
  const baseQuery = db
    .select({
      voterId: votes.voterId,
      betterId: votes.betterId,
      choice: votes.choice,
      winner: betters.winner,
      betterCategory: betters.category,
      voterUsername: users.username,
      voterName: users.name,
      voterEmail: users.email,
    })
    .from(votes)
    .innerJoin(betters, eq(votes.betterId, betters.id))
    .leftJoin(users, eq(votes.voterId, users.id))

  const allRows = categoryFilter === 'all'
    ? await baseQuery
    : await db
        .select({
          voterId: votes.voterId,
          betterId: votes.betterId,
          choice: votes.choice,
          winner: betters.winner,
          betterCategory: betters.category,
          voterUsername: users.username,
          voterName: users.name,
          voterEmail: users.email,
        })
        .from(votes)
        .innerJoin(betters, and(
          eq(votes.betterId, betters.id),
          eq(betters.category, categoryFilter as BetterCategory),
        ))
        .leftJoin(users, eq(votes.voterId, users.id))

  // winner 미확정 betters의 다수결 계산
  const betterCounts = new Map<string, { A: number; B: number; stored: string | null }>()
  for (const v of allRows) {
    if (!betterCounts.has(v.betterId)) {
      betterCounts.set(v.betterId, { A: 0, B: 0, stored: v.winner })
    }
    betterCounts.get(v.betterId)![v.choice as 'A' | 'B']++
  }

  // 유효 winner: stored 우선, 없으면 다수결
  const effectiveWinner = new Map<string, 'A' | 'B' | null>()
  for (const [id, c] of betterCounts) {
    effectiveWinner.set(
      id,
      c.stored
        ? (c.stored as 'A' | 'B')
        : c.A > c.B ? 'A' : c.B > c.A ? 'B' : null,
    )
  }

  type Stats = {
    displayName: string
    participated: number  // winner 무관 전체 투표 수
    eligible: number      // winner 확정된 Better 중 투표 수
    hits: number          // winner와 일치한 수
  }
  const statsMap = new Map<string, Stats>()

  for (const v of allRows) {
    if (!statsMap.has(v.voterId)) {
      const name =
        v.voterUsername ??
        v.voterName ??
        v.voterEmail?.split('@')[0] ??
        `사용자 ${v.voterId.slice(0, 6)}`
      statsMap.set(v.voterId, { displayName: name, participated: 0, eligible: 0, hits: 0 })
    }
    const s = statsMap.get(v.voterId)!
    s.participated++                       // 항상 참여 수에 포함
    const w = effectiveWinner.get(v.betterId)
    if (w) {
      s.eligible++                         // winner 확정된 것만 적중률 계산
      if (v.choice === w) s.hits++
    }
  }

  const allEntries: RankEntry[] = [...statsMap.entries()].map(([userId, s]) => ({
    userId,
    displayName: s.displayName,
    participated: s.participated,
    hits: s.hits,
    accuracy: s.eligible > 0 ? Math.round((s.hits / s.eligible) * 100) : -1,
  }))

  console.log('[ranking] allRows:', allRows.length, 'allEntries:', allEntries.length)
  console.log('[ranking] sample entries:', allEntries.slice(0, 3))

  // 참여 수 랭킹
  const participationRanking = [...allEntries]
    .sort((a, b) => b.participated - a.participated || b.accuracy - a.accuracy)
    .slice(0, 20)

  // 적중률 랭킹: winner 확정된 Better에 투표한 유저만
  const accuracyRanking = [...allEntries]
    .filter(e => e.accuracy !== -1)
    .sort((a, b) => b.accuracy - a.accuracy || b.participated - a.participated)
    .slice(0, 20)

  let myStats: MyStats | null = null
  if (currentUserId) {
    const mine = statsMap.get(currentUserId)
    myStats = mine
      ? { participated: mine.participated, hits: mine.hits, accuracy: mine.eligible > 0 ? Math.round((mine.hits / mine.eligible) * 100) : -1 }
      : { participated: 0, hits: 0, accuracy: -1 }
  }

  return { myStats, participationRanking, accuracyRanking }
}

export const revalidate = 60

// ─── 페이지 ────────────────────────────────────────────────────────
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategory: CategoryFilter =
    CATEGORY_FILTERS.find(f => f.id === category)?.id ?? 'all'

  const supabase = await createClient()
  const { data: { user } } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>(resolve =>
      setTimeout(() => resolve({ data: { user: null } }), 3000)
    ),
  ])

  try {
    const { myStats, participationRanking, accuracyRanking } = await buildRankingData(
      user?.id,
      activeCategory,
    )
    return (
      <RankingView
        myStats={myStats}
        participationRanking={participationRanking}
        accuracyRanking={accuracyRanking}
        currentUserId={user?.id}
        currentCategory={activeCategory}
      />
    )
  } catch {
    return (
      <RankingView
        myStats={null}
        participationRanking={[]}
        accuracyRanking={[]}
        currentCategory={activeCategory}
      />
    )
  }
}
