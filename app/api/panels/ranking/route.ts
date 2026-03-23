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
  accuracy: number | null // null = 전체(참여 수) 모드
}

export type PanelRankResponse = {
  entries: PanelRankEntry[]
  myEntry: { rank: number | null; participated: number; accuracy: number | null } | null
}

// 최소 투표 수 기준
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

// ── 전체: 참여 수 기준 (winner 무관) ───────────────────────────
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

// ── 카테고리: winner 확정 기반 적중률 ──────────────────────────
async function buildCategoryRanking(
  category: BetterCategory,
  currentUserId: string | null,
): Promise<PanelRankResponse> {
  // 해당 카테고리 votes + winner 컬럼
  const rows = await db
    .select({
      voterId: votes.voterId,
      betterId: votes.betterId,
      choice: votes.choice,
      winner: betters.winner,       // null = 미확정
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

  type Stats = { name: string; participated: number; eligible: number; correct: number }
  const statsMap = new Map<string, Stats>()

  for (const v of rows) {
    if (!statsMap.has(v.voterId)) {
      const name =
        v.voterUsername ?? v.voterName ?? v.voterEmail?.split('@')[0] ?? `#${v.voterId.slice(0, 6)}`
      statsMap.set(v.voterId, { name, participated: 0, eligible: 0, correct: 0 })
    }
    const s = statsMap.get(v.voterId)!
    s.participated++                          // winner 무관하게 참여 수 포함
    if (v.winner !== null) {
      s.eligible++                            // winner 확정된 것만 적중률 계산
      if (v.choice === v.winner) s.correct++
    }
  }

  const allEntries = [...statsMap.entries()].map(([id, s]) => ({
    id,
    name: s.name,
    participated: s.participated,
    accuracy: s.eligible > 0 ? Math.round((s.correct / s.eligible) * 100) : null,
  }))

  const entries = allEntries
    .filter(e => e.participated >= MIN_VOTES_CAT && e.accuracy !== null)
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
