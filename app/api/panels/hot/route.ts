import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { betters, likes, users } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

export type PanelHotEntry = {
  id: string
  title: string
  imageAUrl: string
  imageBUrl: string
  category: BetterCategory
  likeCount: number
  createdAt: string
  isTextOnly: boolean
  imageAText: string | null
  imageBText: string | null
  author: {
    id: string
    displayName: string
    avatarUrl: string | null
    country: string | null
  } | null
}

const getCachedHot = unstable_cache(
  async (): Promise<PanelHotEntry[]> => {
    const [allBetters, allLikes] = await Promise.all([
      db.select({
        id: betters.id,
        userId: betters.userId,
        title: betters.title,
        imageAUrl: betters.imageAUrl,
        imageBUrl: betters.imageBUrl,
        imageAText: betters.imageAText,
        imageBText: betters.imageBText,
        isTextOnly: betters.isTextOnly,
        category: betters.category,
        createdAt: betters.createdAt,
        authorUsername: users.username,
        authorName: users.name,
        authorEmail: users.email,
        authorAvatarUrl: users.avatarUrl,
        authorCountry: users.country,
      }).from(betters).leftJoin(users, eq(betters.userId, users.id)),
      db.select({ betterId: likes.betterId }).from(likes),
    ])

    const likeCountMap = new Map<string, number>()
    for (const l of allLikes) {
      likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
    }

    return allBetters
      .map(b => ({
        ...b,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt),
        likeCount: likeCountMap.get(b.id) ?? 0,
        author: {
          id: b.userId,
          displayName: b.authorUsername ?? b.authorName ?? b.authorEmail?.split('@')[0] ?? '?',
          avatarUrl: b.authorAvatarUrl ?? null,
          country: b.authorCountry ?? null,
        },
      }))
      .filter(b => b.likeCount > 0)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 50)
  },
  ['panel-hot'],
  { revalidate: 60 },
)

export async function GET() {
  try {
    const data = await getCachedHot()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}
