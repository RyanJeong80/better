import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { votes, users } from '@/lib/db/schema'

export type PanelRankEntry = {
  id: string
  name: string
  participated: number
}

const getCachedRanking = unstable_cache(
  async (): Promise<PanelRankEntry[]> => {
    const allVotes = await db
      .select({
        voterId: votes.voterId,
        voterName: users.name,
        voterEmail: users.email,
        voterUsername: users.username,
      })
      .from(votes)
      .leftJoin(users, eq(votes.voterId, users.id))

    const countMap = new Map<string, { name: string; count: number }>()
    for (const v of allVotes) {
      if (!countMap.has(v.voterId)) {
        const name =
          v.voterUsername ??
          v.voterName ??
          v.voterEmail?.split('@')[0] ??
          `#${v.voterId.slice(0, 6)}`
        countMap.set(v.voterId, { name, count: 0 })
      }
      countMap.get(v.voterId)!.count++
    }

    return [...countMap.entries()]
      .map(([id, s]) => ({ id, name: s.name, participated: s.count }))
      .sort((a, b) => b.participated - a.participated)
      .slice(0, 30)
  },
  ['panel-ranking'],
  { revalidate: 60 },
)

export async function GET() {
  try {
    const data = await getCachedRanking()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([])
  }
}
