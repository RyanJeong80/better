'use client'

import { useState, useCallback } from 'react'
import { SwipeSections } from '@/components/layout/swipe-sections'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'
import { RankingPanelClient } from '@/components/home/ranking-panel-client'
import { HotPanelClient } from '@/components/home/hot-panel-client'
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
  const [activePanel, setActivePanel] = useState(1) // 0=랭킹, 1=Better, 2=Hot
  const [currentBattle, setCurrentBattle] = useState<BattleForVoting | null>(initialBattle)

  // Top100 카드 클릭 시 호출 — 패널 전환 + 해당 Better 표시를 동시에 처리
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
    setActivePanel(1) // Better 패널로 즉시 전환
  }, [])

  return (
    <SwipeSections
      active={activePanel}
      onActiveChange={setActivePanel}
      user={user}
      rankingContent={<RankingPanelClient />}
      betterContent={
        <div style={{ height: '100%' }}>
          {/* key로 battle이 바뀌면 뷰어를 새로 마운트 */}
          <RandomBetterViewer
            key={currentBattle?.id ?? 'empty'}
            initialBattle={currentBattle}
          />
        </div>
      }
      hotContent={<HotPanelClient onSelectBattle={handleSelectFromHot} />}
    />
  )
}
