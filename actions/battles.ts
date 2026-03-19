'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq, ne, notInArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes, users, likes } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

export type BattleForVoting = {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  likeCount: number
  isLiked: boolean
  category: BetterCategory
}


export async function getRandomBattle(
  excludeIds: string[],
  category?: BetterCategory | 'all',
): Promise<BattleForVoting | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let alreadyVotedIds: string[] = []
    if (user) {
      const myVotes = await db.query.votes.findMany({
        where: eq(votes.voterId, user.id),
        columns: { betterId: true },
      })
      alreadyVotedIds = myVotes.map((v) => v.betterId)
    }

    const allExclude = [...new Set([...excludeIds, ...alreadyVotedIds])]
    const userId = user?.id

    const conditions = []
    if (userId) conditions.push(ne(betters.userId, userId))
    if (allExclude.length > 0) conditions.push(notInArray(betters.id, allExclude))
    if (category && category !== 'all') conditions.push(eq(betters.category, category))
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const eligible = await db.select({
      id: betters.id,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      category: betters.category,
    })
      .from(betters)
      .where(whereClause)

    if (!eligible.length) return null
    const picked = eligible[Math.floor(Math.random() * eligible.length)]

    const pickedLikes = await db.select({ userId: likes.userId })
      .from(likes)
      .where(eq(likes.betterId, picked.id))

    return {
      id: picked.id,
      title: picked.title,
      imageAUrl: picked.imageAUrl,
      imageADescription: picked.imageADescription,
      imageBUrl: picked.imageBUrl,
      imageBDescription: picked.imageBDescription,
      likeCount: pickedLikes.length,
      isLiked: userId ? pickedLikes.some((l) => l.userId === userId) : false,
      category: picked.category,
    }
  } catch (e) {
    console.error('[getRandomBattle] DB error:', e)
    return null
  }
}

export type BattleState = { error: string } | { success: true } | null

// 이미지는 클라이언트에서 직접 업로드 후 URL만 전달받아 DB에 저장
export async function saveBattle(
  _prev: BattleState,
  formData: FormData,
): Promise<BattleState> {
  try {
    console.log('[saveBattle] step 1: createClient')
    const supabase = await createClient()

    console.log('[saveBattle] step 2: getUser')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const title = (formData.get('title') as string)?.trim()
    const imageAUrl = formData.get('imageAUrl') as string
    const imageBUrl = formData.get('imageBUrl') as string
    const descriptionA = (formData.get('descriptionA') as string) || ''
    const descriptionB = (formData.get('descriptionB') as string) || ''
    const category = (formData.get('category') as BetterCategory) || 'decision'

    if (!title) return { error: '제목을 입력해주세요' }
    if (!imageAUrl) return { error: '사진 A 업로드가 완료되지 않았습니다' }
    if (!imageBUrl) return { error: '사진 B 업로드가 완료되지 않았습니다' }

    console.log('[saveBattle] step 3: upsert user, id:', user.id)

    // public.users에 없으면 생성 — 실패해도 트리거로 이미 존재하면 FK 통과
    try {
      await db.insert(users).values({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      }).onConflictDoNothing()
    } catch (upsertErr) {
      console.warn('[saveBattle] user upsert failed (continuing):', (upsertErr as Error)?.message)
    }

    console.log('[saveBattle] step 4: DB insert better')

    await db.insert(betters).values({
      userId: user.id,
      title,
      imageAUrl,
      imageADescription: descriptionA || null,
      imageBUrl,
      imageBDescription: descriptionB || null,
      category,
    })

    console.log('[saveBattle] step 4: success')
    revalidatePath('/')
    return { success: true as const }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    const pg = e as Record<string, unknown>
    console.error('[saveBattle] error:', {
      message: pg.message,
      code: pg.code,
      detail: pg.detail,
      hint: pg.hint,
      constraint: pg.constraint,
    })
    return { error: `저장 중 오류가 발생했습니다: ${pg.detail ?? pg.message ?? String(e)}` }
  }
}

export async function getBattles() {
  return db.query.betters.findMany({
    orderBy: (b, { desc }) => [desc(b.createdAt)],
  })
}

export type BattleThumb = {
  id: string
  title: string
  imageAUrl: string
  imageBUrl: string
  category: BetterCategory
}

export async function getBattleThumbnails(
  offset: number,
  category?: BetterCategory | 'all',
): Promise<BattleThumb[]> {
  try {
    const all = await db.query.betters.findMany({
      columns: { id: true, title: true, imageAUrl: true, imageBUrl: true, category: true, createdAt: true },
    })
    return all
      .filter((b) => !category || category === 'all' || b.category === category)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + 10)
      .map(({ id, title, imageAUrl, imageBUrl, category: cat }) => ({ id, title, imageAUrl, imageBUrl, category: cat }))
  } catch {
    return []
  }
}

export async function getBattleById(id: string): Promise<BattleForVoting | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [battle] = await db.select({
      id: betters.id,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      category: betters.category,
    })
      .from(betters)
      .where(eq(betters.id, id))
      .limit(1)

    if (!battle) return null

    const battleLikes = await db.select({ userId: likes.userId })
      .from(likes)
      .where(eq(likes.betterId, id))

    return {
      id: battle.id,
      title: battle.title,
      imageAUrl: battle.imageAUrl,
      imageADescription: battle.imageADescription,
      imageBUrl: battle.imageBUrl,
      imageBDescription: battle.imageBDescription,
      likeCount: battleLikes.length,
      isLiked: user ? battleLikes.some((l) => l.userId === user.id) : false,
      category: battle.category,
    }
  } catch {
    return null
  }
}
