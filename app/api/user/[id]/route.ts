import { NextResponse } from 'next/server'
import { eq, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, userStats, betters } from '@/lib/db/schema'
import { calcLevel } from '@/lib/level'
import type { LevelInfo } from '@/lib/level'

export type PublicUserProfile = {
  id: string
  username: string
  avatarUrl: string | null
  country: string | null
  levelInfo: LevelInfo
  totalVotes: number
  battlesCount: number
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const [dbUser, stats, countResult] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { username: true, avatarUrl: true, country: true },
      }),
      db.query.userStats.findFirst({
        where: eq(userStats.userId, id),
      }),
      db.select({ count: count() }).from(betters).where(eq(betters.userId, id)),
    ])

    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const accuracyRate = stats?.accuracyRate != null ? parseFloat(stats.accuracyRate as string) : null
    const levelInfo = calcLevel(stats?.totalVotes ?? 0, accuracyRate)

    const data: PublicUserProfile = {
      id,
      username: dbUser.username ?? '',
      avatarUrl: dbUser.avatarUrl ?? null,
      country: dbUser.country ?? null,
      levelInfo,
      totalVotes: stats?.totalVotes ?? 0,
      battlesCount: countResult[0]?.count ?? 0,
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
