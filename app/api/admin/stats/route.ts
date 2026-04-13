import { NextRequest, NextResponse } from 'next/server'
import { like, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, betters, votes } from '@/lib/db/schema'

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.replace('Bearer ', '') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [allBattles, allVotes, allUsers, recentBattles] = await Promise.all([
    db.select({ id: betters.id, category: betters.category }).from(betters),
    db.select({ id: votes.id }).from(votes),
    db.select({ id: users.id, email: users.email }).from(users),
    db.select({
      id: betters.id,
      title: betters.title,
      category: betters.category,
      createdAt: betters.createdAt,
    }).from(betters).orderBy(desc(betters.createdAt)).limit(10),
  ])

  const virtualCount = allUsers.filter(u => u.email.startsWith('virtual_') && u.email.endsWith('@touched.local')).length
  const realUserCount = allUsers.length - virtualCount

  const categoryBreakdown: Record<string, number> = {}
  for (const b of allBattles) {
    categoryBreakdown[b.category] = (categoryBreakdown[b.category] ?? 0) + 1
  }

  return NextResponse.json({
    totalBattles: allBattles.length,
    totalVotes: allVotes.length,
    totalRealUsers: realUserCount,
    totalVirtualUsers: virtualCount,
    categoryBreakdown,
    recentBattles,
  })
}
