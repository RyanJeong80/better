import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { votes, users, betters } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'

export type PanelRankEntry = {
  id: string
  name: string
  participated: number
  accuracy: number | null
}

export type PanelRankResponse = {
  entries: PanelRankEntry[]
  myEntry: { rank: number | null; participated: number; accuracy: number | null } | null
}

const MIN_VOTES_ALL = 10
const MIN_VOTES_CAT = 5

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawCat = searchParams.get('category') ?? 'all'
  const category: CategoryFilter =
    CATEGORY_FILTERS.find(f => f.id === rawCat)?.id ?? 'all'

  let currentUserId: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>(r =>
        setTimeout(() => r({ data: { user: null } }), 2000)
      ),
    ])
    currentUserId = data.user?.id ?? null
  } catch {}

  try {
    if (category === 'all') {
      return NextResponse.json(await buildAllRanking(currentUserId))
    }
    return NextResponse.json(
      await buildCategoryRanking(category as BetterCategory, currentUserId)
    )
  } catch {
    return NextResponse.json({ entries: [], myEntry: null })
  }
}

// ── 전체: 참여 수 기준 ───────────────────────────────────────────
async function buildAllRanking(currentUserId: string | null): Promise<PanelRankResponse> {
  const rows = await db
    .select({
      voterId: votes.voterId,
      voterUsername: users.username,
      voterName: users.name,
      voterEmail: users.email,
    })
    .from(votes)
    .leftJoin(users, eq(votes.voterId, users.id))

  const countMap = new Map<string, { name: string; count: number }>()
  for (const v of rows) {
    if (!countMap.has(v.voterId)) {
      const name =
        v.voterUsername ?? v.voterName ?? v.voterEmail?.split('@')[0] ?? `#${v.voterId.slice(0, 6)}`
      countMap.set(v.voterId, { name, count: 0 })
    }
    countMap.get(v.voterId)!.count++
  }

  console.log('[panel/ranking all] countMap size:', countMap.size)

  const entries = [...countMap.entries()]
    .map(([id, s]) => ({ id, name: s.name, participated: s.count, accuracy: null }))
    .sort((a, b) => b.participated - a.participated)
    .slice(0, 30)

  const myEntry = currentUserId
    ? (() => {
        const mine = countMap.get(currentUserId)
        const rank = entries.findIndex(e => e.id === currentUserId) + 1
        return mine
          ? { rank: rank > 0 ? rank : null, participated: mine.count, accuracy: null }
          : { rank: null, participated: 0, accuracy: null }
      })()
    : null

  return { entries, myEntry }
}

// ── 카테고리: winner 기반 적중률 (미확정은 다수결 폴백) ─────────
async function buildCategoryRanking(
  category: BetterCategory,
  currentUserId: string | null,
): Promise<PanelRankResponse> {
  const rows = await db
    .select({
      voterId: votes.voterId,
      betterId: votes.betterId,
      choice: votes.choice,
      winner: betters.winner,
      voterUsername: users.username,
      voterName: users.name,
      voterEmail: users.email,
    })
    .from(votes)
    .innerJoin(betters, and(
      eq(votes.betterId, betters.id),
      eq(betters.category, category),
    ))
    .leftJoin(users, eq(votes.voterId, users.id))

  // winner 미확정 betters의 다수결 계산
  const betterCounts = new Map<string, { A: number; B: number; stored: string | null }>()
  for (const v of rows) {
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

  type Stats = { name: string; participated: number; eligible: number; correct: number }
  const statsMap = new Map<string, Stats>()

  for (const v of rows) {
    if (!statsMap.has(v.voterId)) {
      const name =
        v.voterUsername ?? v.voterName ?? v.voterEmail?.split('@')[0] ?? `#${v.voterId.slice(0, 6)}`
      statsMap.set(v.voterId, { name, participated: 0, eligible: 0, correct: 0 })
    }
    const s = statsMap.get(v.voterId)!
    s.participated++
    const w = effectiveWinner.get(v.betterId)
    if (w) {
      s.eligible++
      if (v.choice === w) s.correct++
    }
  }

  const allEntries = [...statsMap.entries()].map(([id, s]) => ({
    id,
    name: s.name,
    participated: s.participated,
    accuracy: s.eligible > 0 ? Math.round((s.correct / s.eligible) * 100) : null,
  }))

  console.log('[panel/ranking cat] allEntries:', allEntries.length, 'sample:', allEntries.slice(0, 3))

  const entries = allEntries
    .filter(e => e.accuracy !== null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0) || b.participated - a.participated)
    .slice(0, 30)

  const myEntry = currentUserId
    ? (() => {
        const mine = statsMap.get(currentUserId)
        if (!mine) return { rank: null, participated: 0, accuracy: null }
        const accuracy =
          mine.eligible > 0 ? Math.round((mine.correct / mine.eligible) * 100) : null
        const rank = entries.findIndex(e => e.id === currentUserId) + 1
        return { rank: rank > 0 ? rank : null, participated: mine.participated, accuracy }
      })()
    : null

  return { entries, myEntry }
}
