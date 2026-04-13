import { NextRequest, NextResponse } from 'next/server'
import { like, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, userStats } from '@/lib/db/schema'

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

const LEVEL_STATS: Record<string, { totalVotes: number; correctVotes: number; accuracyRate: string; level: number; levelName: string }> = {
  '아이언':     { totalVotes: 0,   correctVotes: 0,   accuracyRate: '0',    level: 1, levelName: '아이언' },
  '브론즈':     { totalVotes: 15,  correctVotes: 8,   accuracyRate: '53.3', level: 2, levelName: '브론즈' },
  '실버':       { totalVotes: 35,  correctVotes: 21,  accuracyRate: '60.0', level: 3, levelName: '실버' },
  '골드':       { totalVotes: 60,  correctVotes: 39,  accuracyRate: '65.0', level: 4, levelName: '골드' },
  '플래티넘':   { totalVotes: 120, correctVotes: 87,  accuracyRate: '72.5', level: 5, levelName: '플래티넘' },
  '다이아몬드': { totalVotes: 250, correctVotes: 202, accuracyRate: '80.8', level: 6, levelName: '다이아몬드' },
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const virtualUsers = await db.select({
    id: users.id,
    name: users.name,
    country: users.country,
    avatarUrl: users.avatarUrl,
    email: users.email,
    createdAt: users.createdAt,
    level: userStats.level,
    levelName: userStats.levelName,
  })
    .from(users)
    .leftJoin(userStats, eq(users.id, userStats.userId))
    .where(like(users.email, 'virtual_%@touched.local'))

  return NextResponse.json({ users: virtualUsers })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, country, levelName } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const id = crypto.randomUUID()
  const shortId = id.replace(/-/g, '').slice(0, 8)
  const email = `virtual_${shortId}@touched.local`
  const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}`

  await db.insert(users).values({ id, email, name, country: country ?? null, avatarUrl })

  const stats = LEVEL_STATS[levelName] ?? LEVEL_STATS['아이언']
  await db.insert(userStats).values({
    userId: id,
    totalVotes: stats.totalVotes,
    correctVotes: stats.correctVotes,
    accuracyRate: stats.accuracyRate,
    level: stats.level,
    levelName: stats.levelName,
  }).onConflictDoNothing()

  return NextResponse.json({ ok: true, user: { id, name, country, avatarUrl, email, levelName: stats.levelName, level: stats.level } })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await db.delete(users).where(eq(users.id, id))
  return NextResponse.json({ ok: true })
}
