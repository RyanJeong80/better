import { NextResponse } from 'next/server'
import { eq, count, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, userStats, betters, follows } from '@/lib/db/schema'
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
  followerCount: number
  followingCount: number
  isFollowing: boolean
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    const [dbUser, stats, countResult, followerResult, followingResult] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { username: true, avatarUrl: true, country: true },
      }),
      db.query.userStats.findFirst({
        where: eq(userStats.userId, id),
      }),
      db.select({ count: count() }).from(betters).where(eq(betters.userId, id)),
      db.select({ count: count() }).from(follows).where(eq(follows.followingId, id)),
      db.select({ count: count() }).from(follows).where(eq(follows.followerId, id)),
    ])

    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let isFollowing = false
    if (currentUser && currentUser.id !== id) {
      const existing = await db.query.follows.findFirst({
        where: and(eq(follows.followerId, currentUser.id), eq(follows.followingId, id)),
        columns: { id: true },
      })
      isFollowing = !!existing
    }

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
      followerCount: followerResult[0]?.count ?? 0,
      followingCount: followingResult[0]?.count ?? 0,
      isFollowing,
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
