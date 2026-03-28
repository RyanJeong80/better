import { NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes, likes, users, userStats } from '@/lib/db/schema'
import { calcLevel } from '@/lib/level'
import type { LevelInfo } from '@/lib/level'
import type { BetterCategory } from '@/lib/constants/categories'

export type ProfileBattleStats = {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  isTextOnly: boolean
  imageAText: string | null
  imageBText: string | null
  votesA: number
  votesB: number
  total: number
  reasons: { choice: 'A' | 'B'; reason: string }[]
  createdAt: string
  closedAt: string | null
  winner: 'A' | 'B' | null
  likesCount: number
  category: BetterCategory
}

export type UserProfileData = {
  username: string
  email: string
  initial: string
  avatarUrl: string | null
  levelInfo: LevelInfo
  totalVotes: number
  accuracyRate: number | null
  catAccuracies: { key: string; value: number }[]
  bestCat: { key: string; value: number } | null
  battles: ProfileBattleStats[]
  battlesVoteTotal: number
  battlesLikesTotal: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser, stats] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { username: true, name: true, avatarUrl: true },
    }).catch(() => null),
    db.query.userStats.findFirst({
      where: eq(userStats.userId, user.id),
    }).catch(() => null),
  ])

  const username = dbUser?.username ?? user.user_metadata?.username ?? dbUser?.name ?? ''
  const nm = user.user_metadata?.name ?? user.user_metadata?.full_name ?? ''
  const email = user.email ?? ''
  const initial = (username || nm || email || '?')[0].toUpperCase()

  const accuracyRate = stats?.accuracyRate != null ? parseFloat(stats.accuracyRate as string) : null
  const levelInfo = calcLevel(stats?.totalVotes ?? 0, accuracyRate)

  const catAccuracies: { key: string; value: number }[] = stats ? [
    { key: 'fashion',    value: stats.fashionAccuracy },
    { key: 'appearance', value: stats.appearanceAccuracy },
    { key: 'love',       value: stats.loveAccuracy },
    { key: 'shopping',   value: stats.shoppingAccuracy },
    { key: 'food',       value: stats.foodAccuracy },
    { key: 'it',         value: stats.itAccuracy },
    { key: 'decision',   value: stats.decisionAccuracy },
  ]
    .filter(c => c.value != null && !isNaN(parseFloat(String(c.value))))
    .map(c => ({ key: c.key, value: parseFloat(String(c.value)) }))
  : []

  const bestCat = catAccuracies.length
    ? catAccuracies.reduce((best, c) => c.value > best.value ? c : best)
    : null

  let battles: ProfileBattleStats[] = []
  let battlesVoteTotal = 0
  let battlesLikesTotal = 0

  try {
    const myBetters = await db.select({
      id: betters.id,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      imageAText: betters.imageAText,
      imageBText: betters.imageBText,
      isTextOnly: betters.isTextOnly,
      category: betters.category,
      createdAt: betters.createdAt,
      closedAt: betters.closedAt,
      winner: betters.winner,
    })
      .from(betters)
      .where(eq(betters.userId, user.id))

    const ids = myBetters.map(b => b.id)
    const [myVotes, myLikes] = ids.length
      ? await Promise.all([
          db.select({ betterId: votes.betterId, choice: votes.choice, reason: votes.reason })
            .from(votes).where(inArray(votes.betterId, ids)),
          db.select({ betterId: likes.betterId })
            .from(likes).where(inArray(likes.betterId, ids)),
        ])
      : [[], []]

    const votesByBetter = new Map<string, { choice: 'A' | 'B'; reason: string | null }[]>()
    for (const v of myVotes) {
      if (!votesByBetter.has(v.betterId)) votesByBetter.set(v.betterId, [])
      votesByBetter.get(v.betterId)!.push({ choice: v.choice, reason: v.reason })
    }
    const likeCountMap = new Map<string, number>()
    for (const l of myLikes) {
      likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
    }

    battles = myBetters
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(b => {
        const bvotes = votesByBetter.get(b.id) ?? []
        return {
          ...b,
          createdAt: b.createdAt.toISOString(),
          closedAt: b.closedAt ? b.closedAt.toISOString() : null,
          winner: b.winner ?? null,
          votesA: bvotes.filter(v => v.choice === 'A').length,
          votesB: bvotes.filter(v => v.choice === 'B').length,
          total: bvotes.length,
          reasons: bvotes
            .filter((v): v is typeof v & { reason: string } => !!v.reason)
            .map(v => ({ choice: v.choice, reason: v.reason })),
          likesCount: likeCountMap.get(b.id) ?? 0,
        }
      })

    battlesVoteTotal = battles.reduce((s, b) => s + b.total, 0)
    battlesLikesTotal = battles.reduce((s, b) => s + b.likesCount, 0)
  } catch (e) {
    console.error('[/api/user/profile]', (e as Error)?.message)
  }

  const data: UserProfileData = {
    username,
    email,
    initial,
    avatarUrl: dbUser?.avatarUrl ?? null,
    levelInfo,
    totalVotes: stats?.totalVotes ?? 0,
    accuracyRate,
    catAccuracies,
    bestCat,
    battles,
    battlesVoteTotal,
    battlesLikesTotal,
  }

  return NextResponse.json(data)
}
