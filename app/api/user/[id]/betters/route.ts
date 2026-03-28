import { NextResponse } from 'next/server'
import { eq, count, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { betters, votes, likes } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

export type PublicBetterItem = {
  id: string
  title: string
  imageAUrl: string
  imageBUrl: string
  isTextOnly: boolean
  imageAText: string | null
  imageBText: string | null
  category: BetterCategory
  voteCount: number
  likeCount: number
  winner: 'A' | 'B' | null
  createdAt: string
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const myBetters = await db.select({
      id: betters.id,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageBUrl: betters.imageBUrl,
      isTextOnly: betters.isTextOnly,
      imageAText: betters.imageAText,
      imageBText: betters.imageBText,
      category: betters.category,
      winner: betters.winner,
      createdAt: betters.createdAt,
    })
      .from(betters)
      .where(eq(betters.userId, id))
      .orderBy(desc(betters.createdAt))
      .limit(50)

    if (!myBetters.length) return NextResponse.json([])

    const ids = myBetters.map(b => b.id)
    const { inArray } = await import('drizzle-orm')

    const [voteCounts, likeCounts] = await Promise.all([
      db.select({ betterId: votes.betterId, count: count() })
        .from(votes)
        .where(inArray(votes.betterId, ids))
        .groupBy(votes.betterId),
      db.select({ betterId: likes.betterId, count: count() })
        .from(likes)
        .where(inArray(likes.betterId, ids))
        .groupBy(likes.betterId),
    ])

    const voteMap = new Map(voteCounts.map(v => [v.betterId, v.count]))
    const likeMap = new Map(likeCounts.map(l => [l.betterId, l.count]))

    const data: PublicBetterItem[] = myBetters.map(b => ({
      ...b,
      winner: b.winner ?? null,
      createdAt: b.createdAt.toISOString(),
      voteCount: voteMap.get(b.id) ?? 0,
      likeCount: likeMap.get(b.id) ?? 0,
    }))

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
