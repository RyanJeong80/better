import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes } from '@/lib/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

// 적중률 기준: 5표 이상이고 한쪽이 과반인 Better
const MIN_VOTES = 5

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 내 투표 목록
  const userVotes = await db
    .select({ betterId: votes.betterId, choice: votes.choice })
    .from(votes)
    .where(eq(votes.voterId, user.id))

  if (userVotes.length === 0) {
    return NextResponse.json({ accuracy: null, total: 0, confirmed: 0 })
  }

  const betterIds = userVotes.map(v => v.betterId)

  // 투표한 Better들의 A/B 집계
  const counts = await db
    .select({
      betterId: votes.betterId,
      choice: votes.choice,
      count: sql<number>`count(*)::int`,
    })
    .from(votes)
    .where(inArray(votes.betterId, betterIds))
    .groupBy(votes.betterId, votes.choice)

  // betterId → { A: number, B: number }
  const countMap: Record<string, { A: number; B: number }> = {}
  for (const row of counts) {
    if (!countMap[row.betterId]) countMap[row.betterId] = { A: 0, B: 0 }
    countMap[row.betterId][row.choice as 'A' | 'B'] = row.count
  }

  let confirmed = 0
  let correct = 0

  for (const uv of userVotes) {
    const c = countMap[uv.betterId]
    if (!c) continue
    const total = c.A + c.B
    if (total < MIN_VOTES) continue   // 표 부족 — winner 미확정
    if (c.A === c.B) continue         // 동률 — winner 미확정
    const winner: 'A' | 'B' = c.A > c.B ? 'A' : 'B'
    confirmed++
    if (uv.choice === winner) correct++
  }

  const accuracy = confirmed > 0 ? Math.round((correct / confirmed) * 100) : null

  return NextResponse.json({ accuracy, total: userVotes.length, confirmed })
}
