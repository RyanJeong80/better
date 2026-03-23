import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { votes, users, betters } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'

export type PanelRankEntry = {
  id: string
  name: string
  participated: number
  accuracy: number | null // null = 전체 모드
}

export type PanelRankResponse = {
  entries: PanelRankEntry[]
  myEntry: { rank: number | null; participated: number; accuracy: number | null } | null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawCat = searchParams.get('category') ?? 'all'
  const category: CategoryFilter =
    (CATEGORY_FILTERS.find(f => f.id === rawCat)?.id) ?? 'all'

  // 인증 (myEntry용 — 실패해도 계속)
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
    return NextResponse.json(await buildCategoryRanking(category as BetterCategory, currentUserId))
  } catch {
    return NextResponse.json({ entries: [], myEntry: null })
  }
}

// ── 전체: 참여 수 기준 ──────────────────────────────────────────
async function buildAllRanking(currentUserId: string | null): Promise<PanelRankResponse> {
  const allVotes = await db
    .select({
      voterId: votes.voterId,
      voterName: users.name,
      voterEmail: users.email,
      voterUsername: users.username,
    })
    .from(votes)
    .leftJoin(users, eq(votes.voterId, users.id))

  const countMap = new Map<string, { name: string; count: number }>()
  for (const v of allVotes) {
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

// ── 카테고리: 적중률 기준 ───────────────────────────────────────
async function buildCategoryRanking(
  category: BetterCategory,
  currentUserId: string | null,
): Promise<PanelRankResponse> {
  const catVotes = await db
    .select({
      voterId: votes.voterId,
      betterId: votes.betterId,
      choice: votes.choice,
      storedWinner: betters.winner,
      voterName: users.name,
      voterEmail: users.email,
      voterUsername: users.username,
    })
    .from(votes)
    .innerJoin(betters, eq(votes.betterId, betters.id))
    .leftJoin(users, eq(votes.voterId, users.id))
    .where(eq(betters.category, category))

  // better별 득표 집계 (storedWinner 없는 경우 다수결 계산용)
  const betterCounts = new Map<string, { A: number; B: number; stored: string | null }>()
  for (const v of catVotes) {
    if (!betterCounts.has(v.betterId)) {
      betterCounts.set(v.betterId, { A: 0, B: 0, stored: v.storedWinner })
    }
    betterCounts.get(v.betterId)![v.choice as 'A' | 'B']++
  }

  // 유효 winner 결정: storedWinner 우선, 없으면 다수결
  const effectiveWinner = new Map<string, 'A' | 'B' | null>()
  for (const [id, c] of betterCounts) {
    if (c.stored) {
      effectiveWinner.set(id, c.stored as 'A' | 'B')
    } else {
      effectiveWinner.set(id, c.A > c.B ? 'A' : c.B > c.A ? 'B' : null)
    }
  }

  // 유저별 적중률 계산
  const statsMap = new Map<
    string,
    { name: string; participated: number; correct: number; eligible: number }
  >()
  for (const v of catVotes) {
    if (!statsMap.has(v.voterId)) {
      const name =
        v.voterUsername ?? v.voterName ?? v.voterEmail?.split('@')[0] ?? `#${v.voterId.slice(0, 6)}`
      statsMap.set(v.voterId, { name, participated: 0, correct: 0, eligible: 0 })
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

  const entries = allEntries
    .filter(e => e.accuracy !== null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0) || b.participated - a.participated)
    .slice(0, 30)

  const myEntry = currentUserId
    ? (() => {
        const mine = statsMap.get(currentUserId)
        const rank = entries.findIndex(e => e.id === currentUserId) + 1
        if (!mine) return { rank: null, participated: 0, accuracy: null }
        const accuracy = mine.eligible > 0
          ? Math.round((mine.correct / mine.eligible) * 100)
          : null
        return { rank: rank > 0 ? rank : null, participated: mine.participated, accuracy }
      })()
    : null

  return { entries, myEntry }
}
