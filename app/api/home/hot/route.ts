import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { betters, likes } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

type HotThumb = {
  id: string
  title: string
  imageAUrl: string
  imageBUrl: string
  category: BetterCategory
  likeCount: number
}

const getCachedHotBattles = unstable_cache(
  async (): Promise<HotThumb[]> => {
    const [allBetters, allLikes] = await Promise.all([
      db.select({
        id: betters.id,
        title: betters.title,
        imageAUrl: betters.imageAUrl,
        imageBUrl: betters.imageBUrl,
        category: betters.category,
      }).from(betters),
      db.select({ betterId: likes.betterId }).from(likes),
    ])

    const likeCountMap = new Map<string, number>()
    for (const l of allLikes) {
      likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
    }

    return allBetters
      .map((b) => ({ ...b, likeCount: likeCountMap.get(b.id) ?? 0 }))
      .filter((b) => b.likeCount > 0)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5)
  },
  ['home-hot-battles'],
  { revalidate: 60 },
)

export async function GET() {
  try {
    const data = await getCachedHotBattles()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}
