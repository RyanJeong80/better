import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes, betters, users } from '@/lib/db/schema'
import { RankingView, type RankEntry, type MyStats } from '@/components/ranking/ranking-view'


// ─── 순위 계산 ─────────────────────────────────────────────────────
async function buildRankingData(currentUserId?: string): Promise<{
  myStats: MyStats | null
  participationRanking: RankEntry[]
  accuracyRanking: RankEntry[]
}> {
  const allBetters = await db.query.betters.findMany({
    with: { votes: { columns: { voterId: true, choice: true } } },
    columns: { id: true },
  })

  const betterWinners = new Map<string, 'A' | 'B' | null>()
  for (const better of allBetters) {
    const cntA = better.votes.filter((v) => v.choice === 'A').length
    const cntB = better.votes.filter((v) => v.choice === 'B').length
    betterWinners.set(better.id, cntA > cntB ? 'A' : cntB > cntA ? 'B' : null)
  }

  const allVotes = await db.query.votes.findMany({
    with: { voter: { columns: { id: true, username: true, name: true, email: true } } },
    columns: { betterId: true, voterId: true, choice: true },
  })

  const statsMap = new Map<
    string,
    { displayName: string; participated: number; hits: number; eligibleBase: number }
  >()

  for (const vote of allVotes) {
    if (!statsMap.has(vote.voterId)) {
      const name =
        vote.voter?.username ??
        vote.voter?.name ??
        vote.voter?.email?.split('@')[0] ??
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
export default async function RankingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const { myStats, participationRanking, accuracyRanking } = await buildRankingData(user?.id)
    return (
      <RankingView
        myStats={myStats}
        participationRanking={participationRanking}
        accuracyRanking={accuracyRanking}
        currentUserId={user?.id}
      />
    )
  } catch {
    return (
      <RankingView myStats={null} participationRanking={[]} accuracyRanking={[]} />
    )
  }
}
