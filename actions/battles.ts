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

export async function createBattle(
  _prev: BattleState,
  formData: FormData,
): Promise<BattleState> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const title = formData.get('title') as string
    const imageAFile = formData.get('imageA') as File
    const imageBFile = formData.get('imageB') as File
    const descriptionA = (formData.get('descriptionA') as string) || ''
    const descriptionB = (formData.get('descriptionB') as string) || ''

    if (!imageAFile || imageAFile.size === 0) return { error: '사진 A를 업로드해주세요' }
    if (!imageBFile || imageBFile.size === 0) return { error: '사진 B를 업로드해주세요' }
    if (descriptionA.length > 100) return { error: '사진 A 설명은 100자 이내로 입력해주세요' }
    if (descriptionB.length > 100) return { error: '사진 B 설명은 100자 이내로 입력해주세요' }

    const timestamp = Date.now()

    const { data: imageAData, error: imageAError } = await supabase.storage
      .from('battle-images')
      .upload(`${user.id}/${timestamp}-A`, imageAFile)

    if (imageAError) return { error: `이미지 업로드 실패: ${imageAError.message}` }

    const { data: imageBData, error: imageBError } = await supabase.storage
      .from('battle-images')
      .upload(`${user.id}/${timestamp}-B`, imageBFile)

    if (imageBError) return { error: `이미지 업로드 실패: ${imageBError.message}` }

    const {
      data: { publicUrl: imageAUrl },
    } = supabase.storage.from('battle-images').getPublicUrl(imageAData.path)

    const {
      data: { publicUrl: imageBUrl },
    } = supabase.storage.from('battle-images').getPublicUrl(imageBData.path)

    await db
      .insert(betters)
      .values({
        userId: user.id,
        title,
        imageAUrl,
        imageADescription: descriptionA || null,
        imageBUrl,
        imageBDescription: descriptionB || null,
      })

    revalidatePath('/')
    return { success: true as const }
  } catch (e) {
    // Next.js redirect / notFound 에러는 반드시 재throw
    if (e && typeof e === 'object' && 'digest' in e) throw e
    console.error('[createBattle]', e)
    return { error: '업로드 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
}

export async function getBattles() {
  return db.query.betters.findMany({
    orderBy: (betters, { desc }) => [desc(betters.createdAt)],
    with: { user: true },
  })
}
