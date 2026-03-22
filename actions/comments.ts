'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { comments, users } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

export async function addComment(
  betterId: string,
  content: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = content.trim()
  if (!trimmed) return { error: '댓글을 입력해주세요' }
  if (trimmed.length > 500) return { error: '댓글은 500자 이내로 작성해주세요' }

  try {
    await db.insert(users).values({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    }).onConflictDoNothing()
  } catch (e) {
    console.warn('[addComment] user upsert failed:', (e as Error)?.message)
  }

  await db.insert(comments).values({ betterId, userId: user.id, content: trimmed })
  revalidatePath(`/battles/${betterId}`)
  return { success: true }
}
