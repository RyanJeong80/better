import { NextRequest, NextResponse } from 'next/server'
import { like, eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, votes, betters } from '@/lib/db/schema'

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.replace('Bearer ', '') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { battleId, count, ratioA } = await req.json()
  if (!battleId || !count) return NextResponse.json({ error: 'battleId and count required' }, { status: 400 })

  // Verify battle exists
  const [battle] = await db.select({ id: betters.id }).from(betters).where(eq(betters.id, battleId)).limit(1)
  if (!battle) return NextResponse.json({ error: '존재하지 않는 터치 ID입니다' }, { status: 404 })

  // Fetch virtual users
  const virtualUsers = await db.select({ id: users.id })
    .from(users)
    .where(like(users.email, 'virtual_%@touched.local'))

  if (virtualUsers.length === 0) {
    return NextResponse.json({ error: '가상 유저가 없습니다. 먼저 가상 유저를 생성하세요.' }, { status: 400 })
  }

  // Already-voted virtual users for this battle
  const existingVotes = await db.select({ voterId: votes.voterId })
    .from(votes)
    .where(eq(votes.betterId, battleId))

  const existingVoterIds = new Set(existingVotes.map(v => v.voterId))
  const eligible = virtualUsers.filter(u => !existingVoterIds.has(u.id))

  if (eligible.length === 0) {
    return NextResponse.json({ error: '가용한 가상 유저가 없습니다 (모두 이미 투표함)' }, { status: 400 })
  }

  const actualCount = Math.min(count, eligible.length)
  const aRatio = ratioA ?? 60
  const aCount = Math.round(actualCount * aRatio / 100)

  // Shuffle eligible users
  const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, actualCount)

  const newVotes = shuffled.map((u, i) => ({
    betterId: battleId,
    voterId: u.id,
    choice: i < aCount ? ('A' as const) : ('B' as const),
  }))

  await db.insert(votes).values(newVotes).onConflictDoNothing()

  return NextResponse.json({ ok: true, created: newVotes.length, aCount, bCount: newVotes.length - aCount })
}
