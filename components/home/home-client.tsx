'use client'

import { useState, useCallback } from 'react'
import { SwipeSections } from '@/components/layout/swipe-sections'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'
import { RankingPanelClient } from '@/components/home/ranking-panel-client'
import { HotPanelClient } from '@/components/home/hot-panel-client'
import { ProfilePanelClient } from '@/components/profile/profile-panel-client'
import type { BattleForVoting } from '@/actions/battles'
import type { PanelHotEntry } from '@/app/api/panels/hot/route'
import type { UserInfo } from '@/app/(main)/page'

export function HomeClient({
  initialBattle,
  user,
}: {
  initialBattle: BattleForVoting | null
  user: UserInfo | null
}) {
  const [activePanel, setActivePanel] = useState(0) // 0=랜덤Better, 1=Hot Better, 2=랭킹, 3=프로필
  const [currentBattle, setCurrentBattle] = useState<BattleForVoting | null>(initialBattle)

  // Hot Better 카드 클릭 시 호출 — 랜덤Better 패널(0)로 전환 + 해당 Better 표시
  const handleSelectFromHot = useCallback((entry: PanelHotEntry) => {
    setCurrentBattle({
      id: entry.id,
      title: entry.title,
      imageAUrl: entry.imageAUrl,
      imageADescription: null,
      imageBUrl: entry.imageBUrl,
      imageBDescription: null,
      likeCount: entry.likeCount,
      isLiked: false,
      category: entry.category,
    })
    setActivePanel(0) // 랜덤Better 패널로 전환
  }, [])

  return (
    <SwipeSections
      active={activePanel}
      onActiveChange={setActivePanel}
      user={user}
      betterContent={
        <div style={{ height: '100%' }}>
          <RandomBetterViewer
            key={currentBattle?.id ?? 'empty'}
            initialBattle={currentBattle}
          />
        </div>
      }
      hotContent={<HotPanelClient onSelectBattle={handleSelectFromHot} />}
      rankingContent={<RankingPanelClient />}
      profileContent={<ProfilePanelClient user={user} />}
    />
  )
}
