import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes, betters } from '@/lib/db/schema'
import { eq, inArray, sql, isNotNull } from 'drizzle-orm'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 내 전체 투표 목록
  const userVotes = await db
    .select({ betterId: votes.betterId, choice: votes.choice })
    .from(votes)
    .where(eq(votes.voterId, user.id))

  const total = userVotes.length
  if (total === 0) return NextResponse.json({ accuracy: null, total: 0 })

  const betterIds = userVotes.map(v => v.betterId)

  // 1) 확정된 winner가 있는 betters 조회 (closed + winner 확정)
  const closedBetters = await db
    .select({ id: betters.id, winner: betters.winner })
    .from(betters)
    .where(inArray(betters.id, betterIds))

  const storedWinnerMap = new Map<string, 'A' | 'B' | null>()
  for (const b of closedBetters) {
    if (b.winner) storedWinnerMap.set(b.id, b.winner as 'A' | 'B')
  }

  // 2) winner 미확정 betters는 현재 다수결로 임시 계산
  const undecidedIds = betterIds.filter(id => !storedWinnerMap.has(id))
  const runtimeWinnerMap = new Map<string, 'A' | 'B' | null>()

  if (undecidedIds.length > 0) {
    const counts = await db
      .select({
        betterId: votes.betterId,
        choice: votes.choice,
        count: sql<number>`count(*)::int`,
      })
      .from(votes)
      .where(inArray(votes.betterId, undecidedIds))
      .groupBy(votes.betterId, votes.choice)

    const countMap: Record<string, { A: number; B: number }> = {}
    for (const row of counts) {
      if (!countMap[row.betterId]) countMap[row.betterId] = { A: 0, B: 0 }
      countMap[row.betterId][row.choice as 'A' | 'B'] = row.count
    }
    for (const [id, c] of Object.entries(countMap)) {
      if (c.A === c.B) runtimeWinnerMap.set(id, null)
      else runtimeWinnerMap.set(id, c.A > c.B ? 'A' : 'B')
    }
  }

  // 3) 적중률 계산
  let judged = 0
  let correct = 0

  for (const uv of userVotes) {
    const winner = storedWinnerMap.get(uv.betterId) ?? runtimeWinnerMap.get(uv.betterId)
    if (!winner) continue  // 동률 또는 아직 표 없음
    judged++
    if (uv.choice === winner) correct++
  }

  const accuracy = judged > 0 ? Math.round((correct / judged) * 100) : null
  return NextResponse.json({ accuracy, total })
}
