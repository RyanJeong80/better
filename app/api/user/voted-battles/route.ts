import { NextResponse } from 'next/server'
import { eq, inArray, desc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes, betters, users } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

export type VotedBattle = {
  betterId: string
  myChoice: 'A' | 'B'
  votedAt: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  isTextOnly: boolean
  imageAText: string | null
  imageBText: string | null
  category: BetterCategory
  winner: 'A' | 'B' | null
  votesA: number
  votesB: number
  total: number
  author: {
    id: string
    displayName: string
    avatarUrl: string | null
    country: string | null
  } | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  try {
    const myVotes = await db.select({
      choice: votes.choice,
      betterId: votes.betterId,
      votedAt: votes.createdAt,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      isTextOnly: betters.isTextOnly,
      imageAText: betters.imageAText,
      imageBText: betters.imageBText,
      category: betters.category,
      winner: betters.winner,
      authorId: users.id,
      authorUsername: users.username,
      authorName: users.name,
      authorEmail: users.email,
      authorAvatarUrl: users.avatarUrl,
      authorCountry: users.country,
    })
      .from(votes)
      .innerJoin(betters, eq(votes.betterId, betters.id))
      .leftJoin(users, eq(betters.userId, users.id))
      .where(eq(votes.voterId, user.id))
      .orderBy(desc(votes.createdAt))

    if (myVotes.length === 0) return NextResponse.json([])

    const betterIds = [...new Set(myVotes.map(v => v.betterId))]
    const allVotesForBattles = await db.select({
      betterId: votes.betterId,
      choice: votes.choice,
    })
      .from(votes)
      .where(inArray(votes.betterId, betterIds))

    const countMap = new Map<string, { A: number; B: number }>()
    for (const v of allVotesForBattles) {
      if (!countMap.has(v.betterId)) countMap.set(v.betterId, { A: 0, B: 0 })
      countMap.get(v.betterId)![v.choice]++
    }

    const result: VotedBattle[] = myVotes.map(v => {
      const counts = countMap.get(v.betterId) ?? { A: 0, B: 0 }
      return {
        betterId: v.betterId,
        myChoice: v.choice,
        votedAt: v.votedAt instanceof Date ? v.votedAt.toISOString() : String(v.votedAt),
        title: v.title,
        imageAUrl: v.imageAUrl,
        imageADescription: v.imageADescription,
        imageBUrl: v.imageBUrl,
        imageBDescription: v.imageBDescription,
        isTextOnly: v.isTextOnly,
        imageAText: v.imageAText,
        imageBText: v.imageBText,
        category: v.category,
        winner: v.winner ?? null,
        votesA: counts.A,
        votesB: counts.B,
        total: counts.A + counts.B,
        author: v.authorId ? {
          id: v.authorId,
          displayName: v.authorUsername ?? v.authorName ?? v.authorEmail?.split('@')[0] ?? '?',
          avatarUrl: v.authorAvatarUrl ?? null,
          country: v.authorCountry ?? null,
        } : null,
      }
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[/api/user/voted-battles]', (e as Error)?.message)
    return NextResponse.json([])
  }
}
