import { Trophy } from 'lucide-react'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { betters, likes, votes, users } from '@/lib/db/schema'
import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { HotBattlesCard } from '@/components/home/hot-battles-card'
import { HomeBetterViewer } from '@/components/home/home-better-viewer'
import { SplashScreen } from '@/components/home/splash-screen'
import type { BetterCategory } from '@/lib/constants/categories'

// ─── 타입 ─────────────────────────────────────────────────────────
type HotThumb = { id: string; title: string; imageAUrl: string; imageBUrl: string; category: BetterCategory; likeCount: number }
type Ranker = { name: string; participated: number }

// ─── 타임아웃 헬퍼 ────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ])
}

// ─── 데이터 패칭 ──────────────────────────────────────────────────
async function fetchHomeData(): Promise<{
  initialBattle: BattleForVoting | null
  hotBattles: HotThumb[]
  rankers: Ranker[]
}> {
  const [battleResult, hotResult, rankResult] = await Promise.allSettled([
    // 1) 랜덤 배틀 — 5초 타임아웃
    withTimeout(getRandomBattle([], undefined), 5000),

    // 2) Hot 배틀 — 좋아요 TOP 5, 5초 타임아웃
    withTimeout((async (): Promise<HotThumb[]> => {
      const [allBetters, allLikes] = await Promise.all([
        db.select({
          id: betters.id,
          title: betters.title,
          imageAUrl: betters.imageAUrl,
          imageBUrl: betters.imageBUrl,
          category: betters.category,
        }).from(betters),
        db.select({ betterId: likes.betterId }).from(likes),
      ])
      const likeCountMap = new Map<string, number>()
      for (const l of allLikes) {
        likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
      }
      return allBetters
        .map((b) => ({ ...b, likeCount: likeCountMap.get(b.id) ?? 0 }))
        .filter((b) => b.likeCount > 0)
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 5)
    })(), 5000),

    // 3) 랭킹 — 투표 수 TOP 5, 5초 타임아웃
    withTimeout((async (): Promise<Ranker[]> => {
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
      return [...countMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((r) => ({ name: r.name, participated: r.count }))
    })(), 5000),
  ])

  return {
    initialBattle: battleResult.status === 'fulfilled' ? battleResult.value : null,
    hotBattles:    hotResult.status    === 'fulfilled' ? hotResult.value    : [],
    rankers:       rankResult.status   === 'fulfilled' ? rankResult.value   : [],
  }
}

// ─── 페이지 ───────────────────────────────────────────────────────
export default async function HomePage() {
  const { initialBattle, hotBattles, rankers } = await fetchHomeData().catch(() => ({
    initialBattle: null as BattleForVoting | null,
    hotBattles: [] as HotThumb[],
    rankers: [] as Ranker[],
  }))

  return (
    <>
      <SplashScreen />
      <div className="space-y-8 md:space-y-12">

        {/* ── 랜덤 Better (히어로 위치) ── */}
        <section className="space-y-3">
          <h2 className="text-xl font-black text-foreground">랜덤 Better 보기</h2>
          <HomeBetterViewer initialBattle={initialBattle} />
        </section>

        {/* ── Hot 100 + 랭킹 ── */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <HotBattlesCard initialBattles={hotBattles} />

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
    </>
  )
}

// ─── 피처 카드 컴포넌트 ────────────────────────────────────────────
function FeatureCard({
  icon, iconBg, title, href, linkLabel, accentColor, children,
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
      <span className="mt-auto text-xs font-bold" style={{ color: accentColor }}>
        {linkLabel} →
      </span>
    </Link>
  )
}
