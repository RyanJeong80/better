import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { betters, likes, votes, users } from '@/lib/db/schema'
import { AnimatedWord } from '@/components/home/animated-word'
import { RandomBattlesCard } from '@/components/home/random-battles-card'
import { HotBattlesCard } from '@/components/home/hot-battles-card'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'


// ─── 타입 ─────────────────────────────────────────────────────────
type BattleThumb = { id: string; title: string; imageAUrl: string; imageBUrl: string; category: BetterCategory }
type HotThumb = BattleThumb & { likeCount: number }
type Ranker = { name: string; participated: number }


// ─── 데이터 패칭 ──────────────────────────────────────────────────
// max:1 연결 제한 — 모든 DB 쿼리를 순차 실행
async function fetchHomeData(): Promise<{
  randomBattles: BattleThumb[]
  hotBattles: HotThumb[]
  rankers: Ranker[]
}> {
  // 각 쿼리를 독립 try/catch로 분리 — 하나가 실패해도 나머지는 계속 실행
  let randomBattles: BattleThumb[] = []
  let hotBattles: HotThumb[] = []
  let rankers: Ranker[] = []

  // ── betters + likes ──────────────────────────────────────────────
  // db.query with: 절은 LATERAL join + json_agg 를 생성 →
  // Supabase Transaction Pooler(PgBouncer)에서 실패
  // → db.select().from() + 별도 likes 쿼리로 JS에서 조인
  try {
    const allBetters = await db.select({
      id: betters.id,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageBUrl: betters.imageBUrl,
      category: betters.category,
      createdAt: betters.createdAt,
    }).from(betters)

    console.log('[HomePage] allBetters count:', allBetters.length, '| first createdAt type:', typeof allBetters[0]?.createdAt, '| value:', allBetters[0]?.createdAt)

    const allLikes = await db.select({ betterId: likes.betterId }).from(likes)
    console.log('[HomePage] allLikes count:', allLikes.length)

    const likeCountMap = new Map<string, number>()
    for (const l of allLikes) {
      likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
    }

    randomBattles = [...allBetters]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(({ id, title, imageAUrl, imageBUrl, category }) => ({ id, title, imageAUrl, imageBUrl, category }))

    hotBattles = allBetters
      .map((b) => ({ id: b.id, title: b.title, imageAUrl: b.imageAUrl, imageBUrl: b.imageBUrl, category: b.category, likeCount: likeCountMap.get(b.id) ?? 0 }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5) as HotThumb[]
  } catch (e) {
    console.error('[betters error]', e)
    console.error('[betters error JSON]', JSON.stringify(e, Object.getOwnPropertyNames(e as any)))
  }

  // ── votes + voter ─────────────────────────────────────────────────
  // 마찬가지로 LATERAL 대신 plain LEFT JOIN 사용
  try {
    const allVotes = await db.select({
      voterId: votes.voterId,
      voterName: users.name,
      voterEmail: users.email,
    })
      .from(votes)
      .leftJoin(users, eq(votes.voterId, users.id))

    const countMap = new Map<string, { name: string; count: number }>()
    for (const v of allVotes) {
      if (!countMap.has(v.voterId)) {
        countMap.set(v.voterId, {
          name: v.voterName ?? v.voterEmail?.split('@')[0] ?? '사용자',
          count: 0,
        })
      }
      countMap.get(v.voterId)!.count++
    }
    rankers = [...countMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((r) => ({ name: r.name, participated: r.count }))
  } catch (e) {
    console.error('[votes error]', e)
    console.error('[votes error JSON]', JSON.stringify(e, Object.getOwnPropertyNames(e as any)))
  }

  console.log('[HomePage] final: randomBattles:', randomBattles.length, '| hotBattles:', hotBattles.length, '| rankers:', rankers.length)

  return { randomBattles, hotBattles, rankers }
}

// ─── 페이지 ───────────────────────────────────────────────────────
export default async function HomePage() {
  // fetchHomeData 내부에서 각 쿼리 에러를 처리하지만 혹시 모를 전파도 막음
  const { randomBattles, hotBattles, rankers } = await fetchHomeData().catch(() => ({
    randomBattles: [] as BattleThumb[],
    hotBattles: [] as HotThumb[],
    rankers: [] as Ranker[],
  }))

  return (
    <div className="space-y-8 md:space-y-12">
      {/* ── 히어로 ── */}
      <section
        className="relative overflow-hidden rounded-3xl px-6 py-5 text-center md:px-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF2F8 100%)' }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-35" style={{ background: '#818CF8', filter: 'blur(90px)' }} />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-25" style={{ background: '#C084FC', filter: 'blur(90px)' }} />

        <div className="relative mx-auto max-w-2xl">
          <h1 className="flex flex-col gap-0 text-5xl font-black leading-tight tracking-tight text-gray-900 md:text-8xl">
            <span>Which</span>
            <span><AnimatedWord /></span>
            <span>is better?</span>
          </h1>
          <p className="mt-3 text-sm font-bold text-gray-500 md:text-base">
            AI 대신 HI(Human Intelligence)가 선택하는 당신의 고민!
          </p>

          <div className="mt-6 flex flex-row items-center justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center rounded-full px-7 py-3 text-sm font-bold text-white transition-all hover:scale-[1.04] hover:brightness-110 active:scale-100"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}
            >
              랜덤 Better 보기
            </Link>
            <Link
              href="/battles/new"
              className="inline-flex items-center rounded-full px-7 py-3 text-sm font-bold transition-all hover:scale-[1.04] active:scale-100"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(99,102,241,0.25)', color: '#4F46E5', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              내 Better 만들기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 피처 카드 3개 ── */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* 랜덤 Better */}
        <RandomBattlesCard initialBattles={randomBattles} initialOffset={10} />

        {/* Hot 100 */}
        <HotBattlesCard initialBattles={hotBattles} />

        {/* 랭킹 */}
        <FeatureCard
          icon={<Trophy size={20} color="#8B5CF6" />}
          iconBg="#F5F3FF"
          title="Better 랭킹"
          href="/ranking"
          linkLabel="랭킹 더보기"
          accentColor="#8B5CF6"
        >
          <ul className="space-y-2">
            {rankers.map((r, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="w-4 shrink-0 text-center text-xs font-black" style={{ color: i === 0 ? '#D97706' : i === 1 ? '#9CA3AF' : '#B45309' }}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-semibold">{r.name}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: '#8B5CF6' }}>
                  {r.participated}건
                </span>
              </li>
            ))}
          </ul>
        </FeatureCard>
      </section>
    </div>
  )
}

// ─── 피처 카드 컴포넌트 ────────────────────────────────────────────
function FeatureCard({
  icon,
  iconBg,
  title,
  href,
  linkLabel,
  accentColor,
  children,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  href: string
  linkLabel: string
  accentColor: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: iconBg }}>
          {icon}
        </div>
        <h3 className="font-bold text-base">{title}</h3>
      </div>

      <div className="flex-1">{children}</div>

      <span
        className="mt-auto text-xs font-bold"
        style={{ color: accentColor }}
      >
        {linkLabel} →
      </span>
    </Link>
  )
}
