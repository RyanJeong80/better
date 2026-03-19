import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes, users, betters } from '@/lib/db/schema'
import { RankingView, type RankEntry, type MyStats } from '@/components/ranking/ranking-view'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'
import type { CategoryFilter } from '@/lib/constants/categories'


// ─── 순위 계산 ─────────────────────────────────────────────────────
async function buildRankingData(
  currentUserId?: string,
  categoryFilter: CategoryFilter = 'all',
): Promise<{
  myStats: MyStats | null
  participationRanking: RankEntry[]
  accuracyRanking: RankEntry[]
}> {
  // votes + users + betters(카테고리 필터용) 조인
  const allVoteRows = await db.select({
    betterId: votes.betterId,
    voterId: votes.voterId,
    choice: votes.choice,
    betterCategory: betters.category,
    voterUsername: users.username,
    voterName: users.name,
    voterEmail: users.email,
  })
    .from(votes)
    .leftJoin(users, eq(votes.voterId, users.id))
    .leftJoin(betters, eq(votes.betterId, betters.id))

  // 카테고리 필터링
  const filteredVotes = categoryFilter === 'all'
    ? allVoteRows
    : allVoteRows.filter((v) => v.betterCategory === categoryFilter)

  const betterWinners = new Map<string, 'A' | 'B' | null>()
  const votesByBetter = new Map<string, typeof filteredVotes>()
  for (const v of filteredVotes) {
    if (!votesByBetter.has(v.betterId)) votesByBetter.set(v.betterId, [])
    votesByBetter.get(v.betterId)!.push(v)
  }
  for (const [betterId, bvotes] of votesByBetter) {
    const cntA = bvotes.filter((v) => v.choice === 'A').length
    const cntB = bvotes.filter((v) => v.choice === 'B').length
    betterWinners.set(betterId, cntA > cntB ? 'A' : cntB > cntA ? 'B' : null)
  }

  const statsMap = new Map<
    string,
    { displayName: string; participated: number; hits: number; eligibleBase: number }
  >()

  for (const vote of filteredVotes) {
    if (!statsMap.has(vote.voterId)) {
      const name =
        vote.voterUsername ??
        vote.voterName ??
        vote.voterEmail?.split('@')[0] ??
        `사용자 ${vote.voterId.slice(0, 6)}`
      statsMap.set(vote.voterId, { displayName: name, participated: 0, hits: 0, eligibleBase: 0 })
    }
    const s = statsMap.get(vote.voterId)!
    s.participated++
    const winner = betterWinners.get(vote.betterId)
    if (winner !== null && winner !== undefined) {
      s.eligibleBase++
      if (vote.choice === winner) s.hits++
    }
  }

  const entries: RankEntry[] = Array.from(statsMap.entries()).map(([userId, s]) => ({
    userId,
    displayName: s.displayName,
    participated: s.participated,
    hits: s.hits,
    accuracy: s.eligibleBase > 0 ? Math.round((s.hits / s.eligibleBase) * 100) : -1,
  }))

  const participationRanking = [...entries]
    .sort((a, b) => b.participated - a.participated || b.accuracy - a.accuracy)
    .slice(0, 20)

  const accuracyRanking = [...entries]
    .filter((e) => e.accuracy !== -1)
    .sort((a, b) => b.accuracy - a.accuracy || b.participated - a.participated)
    .slice(0, 20)

  let myStats: MyStats | null = null
  if (currentUserId) {
    const mine = entries.find((e) => e.userId === currentUserId)
    myStats = mine
      ? { participated: mine.participated, hits: mine.hits, accuracy: mine.accuracy }
      : { participated: 0, hits: 0, accuracy: -1 }
  }

  return { myStats, participationRanking, accuracyRanking }
}

// ─── 페이지 ────────────────────────────────────────────────────────
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategory: CategoryFilter =
    (CATEGORY_FILTERS.find((f) => f.id === category)?.id) ?? 'all'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
