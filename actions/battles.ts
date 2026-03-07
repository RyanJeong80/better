'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq, ne, notInArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes } from '@/lib/db/schema'

export type BattleForVoting = {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  likeCount: number
  isLiked: boolean
}


export async function getRandomBattle(excludeIds: string[]): Promise<BattleForVoting | null> {
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

    const whereClause =
      userId && allExclude.length > 0
        ? and(ne(betters.userId, userId), notInArray(betters.id, allExclude))
        : userId
          ? ne(betters.userId, userId)
          : allExclude.length > 0
            ? notInArray(betters.id, allExclude)
            : undefined

    const eligible = await db.query.betters.findMany({
      where: whereClause,
      columns: {
        id: true,
        title: true,
        imageAUrl: true,
        imageADescription: true,
        imageBUrl: true,
        imageBDescription: true,
      },
      with: {
        likes: { columns: { userId: true } },
      },
    })

    if (!eligible.length) return null
    const picked = eligible[Math.floor(Math.random() * eligible.length)]
    return {
      id: picked.id,
      title: picked.title,
      imageAUrl: picked.imageAUrl,
      imageADescription: picked.imageADescription,
      imageBUrl: picked.imageBUrl,
      imageBDescription: picked.imageBDescription,
      likeCount: picked.likes.length,
      isLiked: userId ? picked.likes.some((l) => l.userId === userId) : false,
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const title = (formData.get('title') as string)?.trim()
    const imageAUrl = formData.get('imageAUrl') as string
    const imageBUrl = formData.get('imageBUrl') as string
    const descriptionA = (formData.get('descriptionA') as string) || ''
    const descriptionB = (formData.get('descriptionB') as string) || ''

    if (!title) return { error: '제목을 입력해주세요' }
    if (!imageAUrl) return { error: '사진 A 업로드가 완료되지 않았습니다' }
    if (!imageBUrl) return { error: '사진 B 업로드가 완료되지 않았습니다' }

    console.log('[saveBattle] inserting to DB for user:', user.id)

    await db.insert(betters).values({
      userId: user.id,
      title,
      imageAUrl,
      imageADescription: descriptionA || null,
      imageBUrl,
      imageBDescription: descriptionB || null,
    })

    console.log('[saveBattle] DB insert success')
    revalidatePath('/')
    return { success: true as const }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    console.error('[saveBattle] error:', e)
    return { error: `저장 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function getBattles() {
  return db.query.betters.findMany({
    orderBy: (betters, { desc }) => [desc(betters.createdAt)],
    with: { user: true },
  })
}
