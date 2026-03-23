import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes } from '@/lib/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

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
  if (total === 0) {
    return NextResponse.json({ accuracy: null, total: 0 })
  }

  const betterIds = userVotes.map(v => v.betterId)

  // 투표한 Better들의 A/B 집계 (내 표 포함 전체)
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

  // 다수결로 임시 winner 계산 (동률 제외)
  let judged = 0
  let correct = 0

  for (const uv of userVotes) {
    const c = countMap[uv.betterId]
    if (!c) continue
    if (c.A === c.B) continue  // 동률 — 판단 불가
    const winner: 'A' | 'B' = c.A > c.B ? 'A' : 'B'
    judged++
    if (uv.choice === winner) correct++
  }

  const accuracy = judged > 0 ? Math.round((correct / judged) * 100) : null

  return NextResponse.json({ accuracy, total })
}
