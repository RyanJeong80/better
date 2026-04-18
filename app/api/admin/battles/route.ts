import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { betters, users } from '@/lib/db/schema'
import type { BetterCategory } from '@/lib/constants/categories'

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.replace('Bearer ', '') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db.select({
    id: betters.id,
    title: betters.title,
    category: betters.category,
    createdAt: betters.createdAt,
    imageAUrl: betters.imageAUrl,
    imageBUrl: betters.imageBUrl,
    userId: betters.userId,
    userName: users.name,
    userCountry: users.country,
  })
    .from(betters)
    .leftJoin(users, eq(betters.userId, users.id))
    .orderBy(desc(betters.createdAt))

  return NextResponse.json({ battles: list })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 })

  const [battle] = await db.select({
    imageAUrl: betters.imageAUrl,
    imageBUrl: betters.imageBUrl,
  }).from(betters).where(eq(betters.id, id)).limit(1)

  if (!battle) return NextResponse.json({ error: '터치를 찾을 수 없습니다' }, { status: 404 })

  await db.delete(betters).where(eq(betters.id, id))

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
    const extractPath = (url: string) => url.match(/battle-images\/(.+)$/)?.[1] ?? null
    const paths = [battle.imageAUrl, battle.imageBUrl].map(extractPath).filter((p): p is string => !!p)
    if (paths.length > 0) {
      await supabase.storage.from('battle-images').remove(paths).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}

const SAMPLE_TOUCHES = [
  // 라이벌
  { category: 'love', title: '메시 vs 호날두', descA: '메시', descB: '호날두',
    seedA: 'messi', seedB: 'ronaldo', desc: '역대 최고의 축구 선수는?' },
  { category: 'love', title: '애플 vs 삼성', descA: 'Apple', descB: 'Samsung',
    seedA: 'apple', seedB: 'samsung', desc: '어느 브랜드가 더 좋아?' },
  { category: 'love', title: 'BTS vs 블랙핑크', descA: 'BTS', descB: 'BLACKPINK',
    seedA: 'bts', seedB: 'blackpink', desc: '더 좋아하는 K-POP 그룹은?' },

  // 패션
  { category: 'fashion', title: '캐주얼 vs 포멀 출근룩', descA: '캐주얼', descB: '포멀',
    seedA: 'casual outfit', seedB: 'formal outfit', desc: '어떤 출근룩이 더 나을까?' },
  { category: 'fashion', title: '나이키 vs 아디다스', descA: 'Nike', descB: 'Adidas',
    seedA: 'nike sneakers', seedB: 'adidas sneakers', desc: '더 선호하는 브랜드는?' },

  // IT
  { category: 'it', title: '아이폰 vs 갤럭시', descA: 'iPhone', descB: 'Galaxy',
    seedA: 'iphone', seedB: 'galaxy phone', desc: '어느 스마트폰이 더 나을까?' },
  { category: 'it', title: '맥북 vs 갤럭시북', descA: 'MacBook', descB: 'Galaxy Book',
    seedA: 'macbook', seedB: 'laptop windows', desc: '어느 노트북이 더 나을까?' },

  // 음식
  { category: 'food', title: '피자 vs 치킨', descA: '피자', descB: '치킨',
    seedA: 'pizza', seedB: 'fried chicken', desc: '야식으로 뭐가 더 당겨?' },
  { category: 'food', title: '짜장면 vs 짬뽕', descA: '짜장면', descB: '짬뽕',
    seedA: 'jajangmyeon', seedB: 'jjamppong', desc: '중국집 메뉴 고민!' },
  { category: 'food', title: '맥도날드 vs 버거킹', descA: '맥도날드', descB: '버거킹',
    seedA: 'mcdonalds burger', seedB: 'burger king', desc: '어느 버거가 더 맛있어?' },

  // 쇼핑
  { category: 'shopping', title: '에어팟 vs 갤럭시버즈', descA: 'AirPods', descB: 'Galaxy Buds',
    seedA: 'airpods', seedB: 'galaxy buds', desc: '어느 무선이어폰이 더 나을까?' },

  // 고민/결정
  { category: 'decision', title: '제주도 vs 오사카 여행', descA: '제주도', descB: '오사카',
    seedA: 'jeju island', seedB: 'osaka japan', desc: '다음 여행지 고민 중!' },
  { category: 'decision', title: '카페 vs 도서관 공부', descA: '카페', descB: '도서관',
    seedA: 'cafe study', seedB: 'library', desc: '어디서 공부가 더 잘돼?' },

  // 외모비교
  { category: 'appearance', title: '단발 vs 장발', descA: '단발', descB: '장발',
    seedA: 'short hair woman', seedB: 'long hair woman', desc: '어떤 헤어스타일이 더 매력적?' },
] as const

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, count, virtualUserId } = await req.json()
  if (!virtualUserId) return NextResponse.json({ error: '가상 유저 ID가 필요합니다' }, { status: 400 })

  // Pick candidates
  const candidates = (category && category !== 'all')
    ? SAMPLE_TOUCHES.filter(t => t.category === category)
    : [...SAMPLE_TOUCHES]

  if (candidates.length === 0) return NextResponse.json({ error: '해당 카테고리 샘플 없음' }, { status: 400 })

  const actualCount = Math.min(count ?? 5, candidates.length)
  const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, actualCount)

  const rows = shuffled.map(t => ({
    userId: virtualUserId as string,
    title: t.title,
    imageAUrl: `https://picsum.photos/seed/${encodeURIComponent(t.seedA)}/400/400`,
    imageBUrl: `https://picsum.photos/seed/${encodeURIComponent(t.seedB)}/400/400`,
    imageADescription: t.descA,
    imageBDescription: t.descB,
    description: t.desc,
    category: t.category as BetterCategory,
    isTextOnly: false,
  }))

  const inserted = await db.insert(betters).values(rows).returning({ id: betters.id })
  return NextResponse.json({ ok: true, created: inserted.length, ids: inserted.map(r => r.id) })
}
