import Link from 'next/link'
import { Shuffle, Flame, Trophy, Heart } from 'lucide-react'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { AnimatedWord } from '@/components/home/animated-word'

// ─── 타입 ─────────────────────────────────────────────────────────
type BattleThumb = { id: string; title: string; imageAUrl: string; imageBUrl: string }
type HotThumb = BattleThumb & { likeCount: number }
type Ranker = { name: string; participated: number }


// ─── 데이터 패칭 ──────────────────────────────────────────────────
async function fetchHomeData(): Promise<{
  randomBattles: BattleThumb[]
  hotBattles: HotThumb[]
  rankers: Ranker[]
}> {
  try {
    // 랜덤 배틀: 최신 6개 중 3개
    const recent = await db.query.betters.findMany({
      columns: { id: true, title: true, imageAUrl: true, imageBUrl: true },
      orderBy: (b, { desc }) => [desc(b.createdAt)],
      limit: 6,
    })
    const randomBattles = recent
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    // Hot 5
    const allWithLikes = await db.query.betters.findMany({
      columns: { id: true, title: true, imageAUrl: true, imageBUrl: true },
      with: { likes: { columns: { id: true } } },
    })
    const hotBattles = allWithLikes
      .map((b) => ({ ...b, likeCount: b.likes.length, likes: undefined }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5) as HotThumb[]

    // 참가 순위 top 5
    const allVotes = await db.query.votes.findMany({
      with: { voter: { columns: { id: true, name: true, email: true } } },
      columns: { voterId: true },
    })
    const countMap = new Map<string, { name: string; count: number }>()
    for (const v of allVotes) {
      if (!countMap.has(v.voterId)) {
        countMap.set(v.voterId, {
          name: v.voter?.name ?? v.voter?.email?.split('@')[0] ?? '사용자',
          count: 0,
        })
      }
      countMap.get(v.voterId)!.count++
    }
    const rankers = [...countMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((r) => ({ name: r.name, participated: r.count }))

    return { randomBattles, hotBattles, rankers }
  } catch (e) {
    console.error('[HomePage] DB error:', e)
    return { randomBattles: [], hotBattles: [], rankers: [] }
  }
}

// ─── 페이지 ───────────────────────────────────────────────────────
export default async function HomePage() {
  const { randomBattles, hotBattles, rankers } = await fetchHomeData()

  return (
    <div className="space-y-8 md:space-y-12">
      {/* ── 히어로 ── */}
      <section
        className="relative overflow-hidden rounded-3xl px-6 py-14 text-center md:px-16 md:py-20"
        style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF2F8 100%)' }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-35" style={{ background: '#818CF8', filter: 'blur(90px)' }} />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-25" style={{ background: '#C084FC', filter: 'blur(90px)' }} />

        <div className="relative mx-auto max-w-2xl">
          <h1 className="flex flex-col gap-0.5 text-6xl font-black leading-tight tracking-tight text-gray-900 md:text-8xl">
            <span>Which</span>
            <span><AnimatedWord /></span>
            <span>is better?</span>
          </h1>
          <p className="mt-5 text-sm font-bold text-gray-500 md:text-base">
            AI 대신 HI(Human Intelligence)가 선택하는 당신의 고민!
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/explore"
              className="inline-flex items-center rounded-full px-14 py-5 text-base font-bold text-white transition-all hover:scale-[1.04] hover:brightness-110 active:scale-100"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}
            >
              랜덤 Better 보기
            </Link>
            <Link
              href="/battles/new"
              className="inline-flex items-center rounded-full px-14 py-5 text-base font-bold transition-all hover:scale-[1.04] active:scale-100"
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
        <FeatureCard
          icon={<Shuffle size={20} color="#6366F1" />}
          iconBg="#EEF2FF"
          title="랜덤 Better 보기"
          href="/explore"
          linkLabel="지금 시작"
          accentColor="#6366F1"
        >
          <ul className="space-y-2">
            {randomBattles.map((b) => (
              <li key={b.id} className="flex items-center gap-2.5">
                <div className="flex shrink-0 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageAUrl} alt="" style={{ width: 34, height: 34, objectFit: 'cover' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageBUrl} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderLeft: '2px solid #F5F3FF' }} />
                </div>
                <span className="truncate text-sm text-muted-foreground">{b.title}</span>
              </li>
            ))}
          </ul>
        </FeatureCard>

        {/* Hot 100 */}
        <FeatureCard
          icon={<Flame size={20} color="#F59E0B" />}
          iconBg="#FFFBEB"
          title="Hot 100 Better"
          href="/hot"
          linkLabel="전체 보기"
          accentColor="#F59E0B"
        >
          <ul className="space-y-2">
            {hotBattles.slice(0, 5).map((b, i) => (
              <li key={b.id} className="flex items-center gap-2.5">
                <span className="w-4 shrink-0 text-center text-xs font-black" style={{ color: i === 0 ? '#D97706' : i === 1 ? '#9CA3AF' : '#B45309' }}>
                  {i + 1}
                </span>
                <div className="flex shrink-0 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageAUrl} alt="" style={{ width: 30, height: 30, objectFit: 'cover' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageBUrl} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderLeft: '2px solid #FFFBEB' }} />
                </div>
                <span className="flex-1 truncate text-sm text-muted-foreground">{b.title}</span>
                <div className="flex shrink-0 items-center gap-0.5" style={{ color: '#F43F5E' }}>
                  <Heart size={10} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                  <span className="text-xs font-bold">{b.likeCount}</span>
                </div>
              </li>
            ))}
          </ul>
        </FeatureCard>

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
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: iconBg }}>
          {icon}
        </div>
        <h3 className="font-bold text-base">{title}</h3>
      </div>

      <div className="flex-1">{children}</div>

      <Link
        href={href}
        className="mt-auto text-xs font-bold transition-opacity hover:opacity-70"
        style={{ color: accentColor }}
      >
        {linkLabel} →
      </Link>
    </div>
  )
}
