import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { HotBattlesCard } from '@/components/home/hot-battles-card'
import { RankingCard } from '@/components/home/ranking-card'
import { HomeBetterViewer } from '@/components/home/home-better-viewer'
import { SplashScreen } from '@/components/home/splash-screen'

// ─── 페이지 ───────────────────────────────────────────────────────
export default async function HomePage() {
  // 인증 없이 랜덤 배틀 1개만 SSR (getUser 네트워크 요청 없음)
  const initialBattle: BattleForVoting | null = await getRandomBattle([], undefined, { skipAuth: true }).catch(() => null)

  return (
    <>
      <SplashScreen />
      <div className="space-y-8 md:space-y-12">

        {/* ── 랜덤 Better (히어로 위치) ── */}
        <section className="space-y-3">
          <h2 className="text-xl font-black text-foreground">랜덤 Better 보기</h2>
          <HomeBetterViewer initialBattle={initialBattle} />
        </section>

        {/* ── Hot 100 + 랭킹 (스크롤 시 lazy load) ── */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <HotBattlesCard />
          <RankingCard />
        </section>

      </div>
    </>
  )
}
