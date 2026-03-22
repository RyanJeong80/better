import { getBattleById, getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { createClient } from '@/lib/supabase/server'
import { SwipeSections } from '@/components/layout/swipe-sections'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'
import { RankingPanelClient } from '@/components/home/ranking-panel-client'
import { HotPanelClient } from '@/components/home/hot-panel-client'

function BetterPanel({
  initialBattle,
  showBack,
}: {
  initialBattle: BattleForVoting | null
  showBack?: boolean
}) {
  return (
    <div style={{ height: '100%' }}>
      <RandomBetterViewer initialBattle={initialBattle} showBack={showBack} />
    </div>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  // id 파라미터가 있으면 해당 Better를, 없으면 랜덤 Better 로드
  let initialBattle: BattleForVoting | null = null
  if (id) {
    initialBattle = await getBattleById(id).catch(() => null)
  }
  if (!initialBattle) {
    initialBattle = await getRandomBattle([], undefined, { skipAuth: true }).catch(() => null)
  }

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
      targetPanel={id ? 1 : undefined}
      rankingContent={<RankingPanelClient />}
      betterContent={<BetterPanel initialBattle={initialBattle} showBack={!!id} />}
      hotContent={<HotPanelClient />}
    />
  )
}
