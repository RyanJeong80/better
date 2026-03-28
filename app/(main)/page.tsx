import { eq } from 'drizzle-orm'
import { getRandomBattle, getBattleById } from '@/actions/battles'
import { createClient } from '@/lib/supabase/server'
import { HomeClient } from '@/components/home/home-client'
import { db } from '@/lib/db'
import { users, userStats } from '@/lib/db/schema'
import { calcLevel } from '@/lib/level'
import type { LevelInfo } from '@/lib/level'

export type UserInfo = {
  id: string
  initial: string
  name: string
  email: string
  avatarUrl: string | null
  levelInfo: LevelInfo
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  let initialBattle = id ? await getBattleById(id).catch(() => null) : null
  if (!initialBattle) {
    initialBattle = await getRandomBattle([], undefined, { skipAuth: true }).catch(() => null)
  }

  let userInfo: UserInfo | null = null
  try {
    const supabase = await createClient()
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>(r =>
        setTimeout(() => r({ data: { user: null } }), 2000)
      ),
    ])
    if (data.user) {
      const nm = data.user.user_metadata?.name ?? data.user.user_metadata?.full_name ?? ''
      const email = data.user.email ?? ''

      let levelInfo = calcLevel(0, null)
      let avatarUrl: string | null = null
      try {
        const [stats, dbUser] = await Promise.all([
          db.query.userStats.findFirst({
            where: eq(userStats.userId, data.user.id),
            columns: { totalVotes: true, accuracyRate: true },
          }),
          db.query.users.findFirst({
            where: eq(users.id, data.user.id),
            columns: { avatarUrl: true },
          }),
        ])
        if (stats) levelInfo = calcLevel(stats.totalVotes, parseFloat(stats.accuracyRate as string))
        avatarUrl = dbUser?.avatarUrl ?? null
      } catch {}

      userInfo = { id: data.user.id, initial: (nm || email || '?')[0].toUpperCase(), name: nm, email, avatarUrl, levelInfo }
    }
  } catch {}

  return <HomeClient initialBattle={initialBattle} user={userInfo} />
}
