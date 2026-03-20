import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { votes, users } from '@/lib/db/schema'

type Ranker = { name: string; participated: number }

const getCachedRanking = unstable_cache(
  async (): Promise<Ranker[]> => {
    const allVotes = await db.select({
      voterId: votes.voterId,
      voterName: users.name,
      voterEmail: users.email,
    })
      .from(votes)
      .leftJoin(users, eq(votes.voterId, users.id))

    const countMap = new Map<string, { name: string; count: number }>()
    for (const v of allVotes) {
      if (!countMap.has(v.voterId)) {
        countMap.set(v.voterId, {
          name: v.voterName ?? v.voterEmail?.split('@')[0] ?? '사용자',
          count: 0,
        })
      }
      countMap.get(v.voterId)!.count++
    }

    return [...countMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((r) => ({ name: r.name, participated: r.count }))
  },
  ['home-ranking'],
  { revalidate: 120 },
)

export async function GET() {
  try {
    const data = await getCachedRanking()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}
