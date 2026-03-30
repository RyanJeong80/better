'use server'

import { and, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { likes, users } from '@/lib/db/schema'

export async function getMyLikedBattleIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  try {
    const myLikes = await db.select({ betterId: likes.betterId })
      .from(likes)
      .where(eq(likes.userId, user.id))
    return myLikes.map(l => l.betterId)
  } catch {
    return []
  }
}

export async function toggleLike(
  betterId: string,
): Promise<{ isLiked: boolean; likeCount: number } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 3000)
    ),
  ])
  if (!user) return { error: '로그인이 필요합니다' }

  try {
    const existing = await db.query.likes.findFirst({
      where: and(eq(likes.betterId, betterId), eq(likes.userId, user.id)),
    })

    try {
      await db.insert(users).values({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      }).onConflictDoNothing()
    } catch (e) {
      console.warn('[toggleLike] user upsert failed (continuing):', (e as Error)?.message)
    }

    if (existing) {
      await db.delete(likes).where(and(eq(likes.betterId, betterId), eq(likes.userId, user.id)))
    } else {
      await db.insert(likes).values({ betterId, userId: user.id })
    }

    const allLikes = await db.query.likes.findMany({
      where: eq(likes.betterId, betterId),
    })

    return { isLiked: !existing, likeCount: allLikes.length }
  } catch {
    return { error: '좋아요 처리에 실패했습니다' }
  }
}
