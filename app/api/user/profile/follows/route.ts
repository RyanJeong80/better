import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, follows } from '@/lib/db/schema'

export type FollowUserItem = {
  id: string
  username: string
  avatarUrl: string | null
  country: string | null
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = new URL(req.url).searchParams.get('type') // 'following' | 'followers'

  try {
    if (type === 'following') {
      // users that I follow
      const list = await db.select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        country: users.country,
      })
        .from(follows)
        .innerJoin(users, eq(follows.followingId, users.id))
        .where(eq(follows.followerId, user.id))
      return NextResponse.json(list.map(u => ({ ...u, username: u.username ?? '' })) as FollowUserItem[])
    } else {
      // users that follow me
      const list = await db.select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        country: users.country,
      })
        .from(follows)
        .innerJoin(users, eq(follows.followerId, users.id))
        .where(eq(follows.followingId, user.id))
      return NextResponse.json(list.map(u => ({ ...u, username: u.username ?? '' })) as FollowUserItem[])
    }
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
