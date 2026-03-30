import { NextResponse } from 'next/server'
import { eq, inArray, desc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes, users } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

export type VotedBattle = {
  id: string
  title: string
  description: string | null
  category: BetterCategory
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  imageAText: string | null
  imageBText: string | null
  isTextOnly: boolean
  myChoice: 'A' | 'B'
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

  const myVotes = await db
    .select({
      choice: votes.choice,
      votedAt: votes.createdAt,
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
      description: betters.description,
      winner: betters.winner,
      closedAt: betters.closedAt,
      betterCreatedAt: betters.createdAt,
      authorId: betters.userId,
    })
    .from(votes)
    .innerJoin(betters, eq(votes.betterId, betters.id))
    .where(eq(votes.voterId, user.id))
    .orderBy(desc(votes.createdAt))

  if (myVotes.length === 0) return NextResponse.json([])

  const betterIds = myVotes.map(v => v.betterId)
  const authorIds = [...new Set(myVotes.map(v => v.authorId))]

  const [allVotes, authors] = await Promise.all([
    db.select({ betterId: votes.betterId, choice: votes.choice })
      .from(votes)
      .where(inArray(votes.betterId, betterIds)),
    db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.id, authorIds)),
  ])

  const authorMap = new Map(authors.map(a => [a.id, a]))

  const voteCountMap = new Map<string, { A: number; B: number }>()
  for (const v of allVotes) {
    const cur = voteCountMap.get(v.betterId) ?? { A: 0, B: 0 }
    cur[v.choice as 'A' | 'B']++
    voteCountMap.set(v.betterId, cur)
  }

  const result: VotedBattle[] = myVotes.map(v => {
    const counts = voteCountMap.get(v.betterId) ?? { A: 0, B: 0 }
    const author = authorMap.get(v.authorId)
    return {
      id: v.betterId,
      title: v.title,
      category: v.category,
      imageAUrl: v.imageAUrl,
      imageADescription: v.imageADescription,
      imageBUrl: v.imageBUrl,
      imageBDescription: v.imageBDescription,
      imageAText: v.imageAText ?? null,
      imageBText: v.imageBText ?? null,
      isTextOnly: v.isTextOnly,
      description: v.description ?? null,
      myChoice: v.choice,
      votesA: counts.A,
      votesB: counts.B,
      total: counts.A + counts.B,
      winner: v.winner ?? null,
      closedAt: v.closedAt ? v.closedAt.toISOString() : null,
      createdAt: v.betterCreatedAt.toISOString(),
      authorId: v.authorId ?? null,
      authorName: author?.username ?? null,
      authorAvatarUrl: author?.avatarUrl ?? null,
    }
  })

  return NextResponse.json(result)
}
