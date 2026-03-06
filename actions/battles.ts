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

const EXPLORE_MOCK: BattleForVoting[] = [
  {
    id: 'explore-1',
    title: '어떤 배경화면이 더 나아?',
    imageAUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop',
    imageADescription: '산 풍경',
    imageBUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=600&fit=crop',
    imageBDescription: '해변 풍경',
    likeCount: 24,
    isLiked: false,
  },
  {
    id: 'explore-2',
    title: '어떤 커피가 더 나아?',
    imageAUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop',
    imageADescription: '아메리카노',
    imageBUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop',
    imageBDescription: '라떼',
    likeCount: 9,
    isLiked: false,
  },
  {
    id: 'explore-3',
    title: '어떤 반려동물이 더 귀여워?',
    imageAUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&h=600&fit=crop',
    imageADescription: '고양이',
    imageBUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop',
    imageBDescription: '강아지',
    likeCount: 41,
    isLiked: false,
  },
  {
    id: 'explore-4',
    title: '어떤 도시가 더 살기 좋아?',
    imageAUrl: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=600&h=600&fit=crop',
    imageADescription: '서울',
    imageBUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=600&fit=crop',
    imageBDescription: '파리',
    likeCount: 17,
    isLiked: false,
  },
]

export async function getRandomBattle(excludeIds: string[]): Promise<BattleForVoting | null> {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')

  if (!isConfigured) {
    const available = EXPLORE_MOCK.filter((b) => !excludeIds.includes(b.id))
    if (!available.length) return null
    return available[Math.floor(Math.random() * available.length)]
  }

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
  } catch {
    return null
  }
}

export type BattleState = { error: string } | null

export async function createBattle(
  _prev: BattleState,
  formData: FormData,
): Promise<BattleState> {
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

  const [better] = await db
    .insert(betters)
    .values({
      userId: user.id,
      title,
      imageAUrl,
      imageADescription: descriptionA || null,
      imageBUrl,
      imageBDescription: descriptionB || null,
    })
    .returning()

  revalidatePath('/')
  redirect(`/battles/${better.id}`)
}

export async function getBattles() {
  return db.query.betters.findMany({
    orderBy: (betters, { desc }) => [desc(betters.createdAt)],
    with: { user: true },
  })
}
