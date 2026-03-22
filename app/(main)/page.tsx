import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { createClient } from '@/lib/supabase/server'
import { SwipeSections } from '@/components/layout/swipe-sections'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'
import { RankingPanelClient } from '@/components/home/ranking-panel-client'
import { HotPanelClient } from '@/components/home/hot-panel-client'

// ─── 랜덤 Better 패널 래퍼 (서버 → 클라이언트 컴포넌트에 initialBattle 전달) ──

function BetterPanel({ initialBattle }: { initialBattle: BattleForVoting | null }) {
  return (
    <div style={{ height: '100%' }}>
      <RandomBetterViewer initialBattle={initialBattle} />
    </div>
  )
}

// ─── 홈 페이지 (SSR: random battle + isLoggedIn만, 나머지는 클라이언트 lazy 로딩) ──

export default async function HomePage() {
  // getRandomBattle만 SSR — 사이드 패널은 클라이언트에서 API 호출
  const initialBattle = await getRandomBattle([], undefined, { skipAuth: true }).catch(() => null)

  let isLoggedIn = false
  try {
    const supabase = await createClient()
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>(r =>
        setTimeout(() => r({ data: { user: null } }), 2000)
      ),
    ])
    isLoggedIn = !!data.user
  } catch {}

  return (
    <SwipeSections
      isLoggedIn={isLoggedIn}
      rankingContent={<RankingPanelClient />}
      betterContent={<BetterPanel initialBattle={initialBattle} />}
      hotContent={<HotPanelClient />}
    />
  )
}
