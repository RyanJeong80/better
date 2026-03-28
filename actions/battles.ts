'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq, ne, notInArray, inArray, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes, users, likes, tags, betterTags } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

export type BattleForVoting = {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  imageAText: string | null
  imageBText: string | null
  isTextOnly: boolean
  likeCount: number
  isLiked: boolean
  category: BetterCategory
  author: {
    id: string
    displayName: string
    avatarUrl: string | null
    country: string | null
  } | null
}


export async function getRandomBattle(
  excludeIds: string[],
  category?: BetterCategory | 'all',
  options?: { skipAuth?: boolean; tagName?: string },
): Promise<BattleForVoting | null> {
  try {
    let userId: string | undefined
    let alreadyVotedIds: string[] = []

    if (!options?.skipAuth) {
      const supabase = await createClient()
      // getUser()는 네트워크 요청 — hang 방지를 위해 3초 타임아웃
      const { data: { user } } = await Promise.race([
        supabase.auth.getUser(),
        new Promise<{ data: { user: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { user: null } }), 3000)
        ),
      ])
      if (user) {
        const myVotes = await db.query.votes.findMany({
          where: eq(votes.voterId, user.id),
          columns: { betterId: true },
        })
        alreadyVotedIds = myVotes.map((v) => v.betterId)
        userId = user.id
      }
    }

    const allExclude = [...new Set([...excludeIds, ...alreadyVotedIds])]

    const conditions = []
    if (userId) conditions.push(ne(betters.userId, userId))
    if (allExclude.length > 0) conditions.push(notInArray(betters.id, allExclude))
    if (category && category !== 'all') conditions.push(eq(betters.category, category))

    // 태그 필터
    if (options?.tagName) {
      const tagged = await db
        .select({ betterId: betterTags.betterId })
        .from(betterTags)
        .innerJoin(tags, and(eq(betterTags.tagId, tags.id), eq(tags.name, options.tagName)))
      if (!tagged.length) return null
      conditions.push(inArray(betters.id, tagged.map(r => r.betterId)))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const eligible = await db.select({
      id: betters.id,
      userId: betters.userId,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      imageAText: betters.imageAText,
      imageBText: betters.imageBText,
      isTextOnly: betters.isTextOnly,
      category: betters.category,
      authorUsername: users.username,
      authorName: users.name,
      authorEmail: users.email,
      authorAvatarUrl: users.avatarUrl,
      authorCountry: users.country,
    })
      .from(betters)
      .leftJoin(users, eq(betters.userId, users.id))
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
      imageAText: picked.imageAText,
      imageBText: picked.imageBText,
      isTextOnly: picked.isTextOnly ?? false,
      likeCount: pickedLikes.length,
      isLiked: userId ? pickedLikes.some((l) => l.userId === userId) : false,
      category: picked.category,
      author: {
        id: picked.userId,
        displayName: picked.authorUsername ?? picked.authorName ?? picked.authorEmail?.split('@')[0] ?? '?',
        avatarUrl: picked.authorAvatarUrl ?? null,
        country: picked.authorCountry ?? null,
      },
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
    const imageAUrl = (formData.get('imageAUrl') as string) || ''
    const imageBUrl = (formData.get('imageBUrl') as string) || ''
    const descriptionA = (formData.get('descriptionA') as string) || ''
    const descriptionB = (formData.get('descriptionB') as string) || ''
    const category = (formData.get('category') as BetterCategory) || 'decision'
    const rawTags = (formData.get('tags') as string) || ''
    const imageAText = (formData.get('imageAText') as string) || null
    const imageBText = (formData.get('imageBText') as string) || null
    const isTextOnly = formData.get('isTextOnly') === 'true'
    const tagNames: string[] = rawTags
      ? JSON.parse(rawTags).map((t: string) => t.toLowerCase().replace(/\s+/g, '').replace(/^#+/, ''))
          .filter((t: string) => t.length > 0 && t.length <= 30).slice(0, 5)
      : []

    if (!title) return { error: '제목을 입력해주세요' }
    if (!isTextOnly) {
      if (!imageAUrl) return { error: '사진 A 업로드가 완료되지 않았습니다' }
      if (!imageBUrl) return { error: '사진 B 업로드가 완료되지 않았습니다' }
    } else {
      if (!imageAText) return { error: 'A 텍스트를 입력해주세요' }
      if (!imageBText) return { error: 'B 텍스트를 입력해주세요' }
    }

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

    const [newBetter] = await db.insert(betters).values({
      userId: user.id,
      title,
      imageAUrl,
      imageADescription: descriptionA || null,
      imageBUrl,
      imageBDescription: descriptionB || null,
      imageAText,
      imageBText,
      isTextOnly,
      category,
    }).returning({ id: betters.id })

    // 태그 저장
    if (tagNames.length > 0) {
      try {
        for (const name of tagNames) {
          const [tag] = await db
            .insert(tags)
            .values({ name })
            .onConflictDoUpdate({ target: tags.name, set: { count: sql`${tags.count} + 1` } })
            .returning({ id: tags.id })
          await db.insert(betterTags).values({ betterId: newBetter.id, tagId: tag.id }).onConflictDoNothing()
        }
      } catch (tagErr) {
        console.warn('[saveBattle] tag save failed (continuing):', (tagErr as Error)?.message)
      }
    }

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
  isTextOnly: boolean
  imageAText: string | null
  imageBText: string | null
}

export async function getBattleThumbnails(
  offset: number,
  category?: BetterCategory | 'all',
): Promise<BattleThumb[]> {
  try {
    const all = await db.select({
      id: betters.id,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageBUrl: betters.imageBUrl,
      imageAText: betters.imageAText,
      imageBText: betters.imageBText,
      isTextOnly: betters.isTextOnly,
      category: betters.category,
      createdAt: betters.createdAt,
    }).from(betters)

    const filtered = all
      .filter((b) => !category || category === 'all' || b.category === category)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (filtered.length === 0) return []

    // Better 수가 적어도 wrap-around로 항상 최대 10개 반환
    const wrappedOffset = offset % filtered.length
    return filtered
      .slice(wrappedOffset, wrappedOffset + 10)
      .map(({ id, title, imageAUrl, imageBUrl, imageAText, imageBText, isTextOnly, category: cat }) => ({
        id, title, imageAUrl, imageBUrl, imageAText, imageBText, isTextOnly, category: cat,
      }))
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
      authorId: betters.userId,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      imageAText: betters.imageAText,
      imageBText: betters.imageBText,
      isTextOnly: betters.isTextOnly,
      category: betters.category,
      authorUsername: users.username,
      authorName: users.name,
      authorEmail: users.email,
      authorAvatarUrl: users.avatarUrl,
      authorCountry: users.country,
    })
      .from(betters)
      .leftJoin(users, eq(betters.userId, users.id))
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
      imageAText: battle.imageAText,
      imageBText: battle.imageBText,
      isTextOnly: battle.isTextOnly ?? false,
      likeCount: battleLikes.length,
      isLiked: user ? battleLikes.some((l) => l.userId === user.id) : false,
      category: battle.category,
      author: {
        id: battle.authorId,
        displayName: battle.authorUsername ?? battle.authorName ?? battle.authorEmail?.split('@')[0] ?? '?',
        avatarUrl: battle.authorAvatarUrl ?? null,
        country: battle.authorCountry ?? null,
      },
    }
  } catch {
    return null
  }
}

export async function deleteBattle(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다' }

    // 소유권 확인 + 이미지 URL 조회 (isTextOnly 제외 — 컬럼 미존재 환경 호환)
    const [battle] = await db
      .select({
        imageAUrl: betters.imageAUrl,
        imageBUrl: betters.imageBUrl,
      })
      .from(betters)
      .where(and(eq(betters.id, id), eq(betters.userId, user.id)))
      .limit(1)

    if (!battle) return { error: '해당 Better를 찾을 수 없거나 권한이 없습니다' }

    // DB 삭제 (CASCADE → votes, likes, comments 자동 삭제)
    await db.delete(betters).where(and(eq(betters.id, id), eq(betters.userId, user.id)))

    // Storage 이미지 삭제 (URL에 battle-images/ 포함된 경우만)
    const extractPath = (url: string) => url.match(/battle-images\/(.+)$/)?.[1] ?? null
    const paths = [battle.imageAUrl, battle.imageBUrl]
      .map(extractPath)
      .filter((p): p is string => !!p)
    if (paths.length > 0) {
      await supabase.storage.from('battle-images').remove(paths).catch(() => {})
    }

    revalidatePath('/')
    return { success: true }
  } catch (e) {
    return { error: `삭제 중 오류가 발생했습니다: ${(e as Error)?.message ?? String(e)}` }
  }
}
