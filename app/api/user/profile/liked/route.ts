import { NextResponse } from 'next/server'
import { and, eq, inArray, desc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes, likes, users } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

export type LikedBattle = {
  id: string
  title: string
  category: BetterCategory
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  imageAText: string | null
  imageBText: string | null
  isTextOnly: boolean
  myChoice: 'A' | 'B' | null  // null이면 투표 안 함
  votesA: number
  votesB: number
  total: number
  winner: 'A' | 'B' | null
  closedAt: string | null
  createdAt: string
  authorId: string | null
  authorName: string | null
  authorAvatarUrl: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myLikes = await db
    .select({
      likedAt: likes.createdAt,
      betterId: betters.id,
      title: betters.title,
      category: betters.category,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      imageAText: betters.imageAText,
      imageBText: betters.imageBText,
      isTextOnly: betters.isTextOnly,
      winner: betters.winner,
      closedAt: betters.closedAt,
      betterCreatedAt: betters.createdAt,
      authorId: betters.userId,
    })
    .from(likes)
    .innerJoin(betters, eq(likes.betterId, betters.id))
    .where(eq(likes.userId, user.id))
    .orderBy(desc(likes.createdAt))

  if (myLikes.length === 0) return NextResponse.json([])

  const betterIds = myLikes.map(l => l.betterId)
  const authorIds = [...new Set(myLikes.map(l => l.authorId).filter((id): id is string => !!id))]

  const [allVotes, myVotes, authors] = await Promise.all([
    db.select({ betterId: votes.betterId, choice: votes.choice })
      .from(votes)
      .where(inArray(votes.betterId, betterIds)),
    db.select({ betterId: votes.betterId, choice: votes.choice })
      .from(votes)
      .where(and(inArray(votes.betterId, betterIds), eq(votes.voterId, user.id))),
    authorIds.length
      ? db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.id, authorIds))
      : Promise.resolve([] as { id: string; username: string | null; avatarUrl: string | null }[]),
  ])

  const authorMap = new Map<string, { id: string; username: string | null; avatarUrl: string | null }>(
    authors.map(a => [a.id, a])
  )
  const myVoteMap = new Map<string, 'A' | 'B'>(
    myVotes.map(v => [v.betterId, v.choice as 'A' | 'B'])
  )

  const voteCountMap = new Map<string, { A: number; B: number }>()
  for (const v of allVotes) {
    const cur = voteCountMap.get(v.betterId) ?? { A: 0, B: 0 }
    cur[v.choice as 'A' | 'B']++
    voteCountMap.set(v.betterId, cur)
  }

  const result: LikedBattle[] = myLikes.map(l => {
    const counts = voteCountMap.get(l.betterId) ?? { A: 0, B: 0 }
    const author = authorMap.get(l.authorId)
    return {
      id: l.betterId,
      title: l.title,
      category: l.category,
      imageAUrl: l.imageAUrl,
      imageADescription: l.imageADescription,
      imageBUrl: l.imageBUrl,
      imageBDescription: l.imageBDescription,
      imageAText: l.imageAText ?? null,
      imageBText: l.imageBText ?? null,
      isTextOnly: l.isTextOnly,
      myChoice: myVoteMap.get(l.betterId) ?? null,
      votesA: counts.A,
      votesB: counts.B,
      total: counts.A + counts.B,
      winner: l.winner ?? null,
      closedAt: l.closedAt ? l.closedAt.toISOString() : null,
      createdAt: l.betterCreatedAt.toISOString(),
      authorId: l.authorId ?? null,
      authorName: author?.username ?? null,
      authorAvatarUrl: author?.avatarUrl ?? null,
    }
  })

  return NextResponse.json(result)
}
