import Link from 'next/link'
import { Heart, Flame } from 'lucide-react'
import { db } from '@/lib/db'

const MOCK_HOT = [
  { id: 'm1', title: '어떤 반려동물이 더 귀여워?', imageAUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop', imageBUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop', likeCount: 41 },
  { id: 'm2', title: '어떤 배경화면이 더 나아?', imageAUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop', imageBUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop', likeCount: 24 },
  { id: 'm3', title: '어떤 도시가 더 살기 좋아?', imageAUrl: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=200&h=200&fit=crop', imageBUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop', likeCount: 17 },
  { id: 'm4', title: '어떤 커피가 더 나아?', imageAUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop', imageBUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop', likeCount: 9 },
]

type HotEntry = { id: string; title: string; imageAUrl: string; imageBUrl: string; likeCount: number }

const RANK_STYLE: Record<number, { bg: string; text: string }> = {
  1: { bg: '#FEF3C7', text: '#D97706' },
  2: { bg: '#F3F4F6', text: '#6B7280' },
  3: { bg: '#FDE8D8', text: '#92400E' },
}

export default async function HotPage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')

  let entries: HotEntry[] = []
  let isDemo = false

  if (!isConfigured) {
    entries = MOCK_HOT
    isDemo = true
  } else {
    try {
      const all = await db.query.betters.findMany({
        columns: { id: true, title: true, imageAUrl: true, imageBUrl: true },
        with: { likes: { columns: { id: true } } },
      })
      entries = all
        .map((b) => ({ id: b.id, title: b.title, imageAUrl: b.imageAUrl, imageBUrl: b.imageBUrl, likeCount: b.likes.length }))
        .filter((b) => b.likeCount > 0)
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 100)
    } catch {
      entries = []
    }
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>미리보기 모드</strong> — Supabase를 연결하면 실제 데이터가 표시됩니다.
        </div>
      )}

      {/* 헤더 */}
      <div
        className="flex items-center gap-4 rounded-3xl px-6 py-6"
        style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', border: '1px solid #FDE68A' }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}
        >
          <Flame size={28} color="white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">Hot 100 Better</h2>
          <p className="mt-0.5 text-sm text-amber-700">좋아요를 가장 많이 받은 Better 100선</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
          <div className="mb-3 text-4xl">🔥</div>
          <p className="font-bold">아직 좋아요가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">랜덤 Better에서 마음에 드는 Better에 좋아요를 눌러보세요</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {entries.map((entry, i) => {
              const rank = i + 1
              const rankStyle = RANK_STYLE[rank]

              return (
                <li key={entry.id}>
                <Link href={`/battles/${entry.id}`} className="flex items-center gap-3 px-4 py-3 md:px-5 md:py-3.5 hover:bg-accent transition-colors">
                  {/* 순위 뱃지 */}
                  {rankStyle ? (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                      style={{ background: rankStyle.bg, color: rankStyle.text }}
                    >
                      {rank}
                    </span>
                  ) : (
                    <span className="w-7 shrink-0 text-center text-sm font-bold text-muted-foreground">
                      {rank}
                    </span>
                  )}

                  {/* 미리보기 이미지 */}
                  <div className="flex shrink-0 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.imageAUrl} alt="A" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.imageBUrl} alt="B" style={{ width: 40, height: 40, objectFit: 'cover', borderLeft: '2px solid var(--color-background)' }} />
                  </div>

                  {/* 제목 */}
                  <span className="flex-1 truncate text-sm font-semibold">{entry.title}</span>

                  {/* 좋아요 */}
                  <div
                    className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1"
                    style={{ background: '#FFF1F2', border: '1px solid #FECDD3' }}
                  >
                    <Heart size={12} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                    <span className="text-xs font-bold tabular-nums" style={{ color: '#F43F5E' }}>
                      {entry.likeCount}
                    </span>
                  </div>
                </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
