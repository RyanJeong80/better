'use server'

import { and, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { follows } from '@/lib/db/schema'

export async function toggleFollow(targetUserId: string): Promise<{ following: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.id === targetUserId) throw new Error('Cannot follow yourself')

  const existing = await db.query.follows.findFirst({
    where: and(
      eq(follows.followerId, user.id),
      eq(follows.followingId, targetUserId),
    ),
    columns: { id: true },
  })

  if (existing) {
    await db.delete(follows).where(
      and(eq(follows.followerId, user.id), eq(follows.followingId, targetUserId)),
    )
    return { following: false }
  } else {
    await db.insert(follows).values({ followerId: user.id, followingId: targetUserId })
    return { following: true }
  }
}
