'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Shuffle } from 'lucide-react'
import { getBattleThumbnails, type BattleThumb } from '@/actions/battles'

export function RandomBattlesCard({
  initialBattles,
  initialOffset,
}: {
  initialBattles: BattleThumb[]
  initialOffset: number
}) {
  const [battles, setBattles] = useState(initialBattles)
  const [offset, setOffset] = useState(initialOffset)
  const [isPending, startTransition] = useTransition()

  function handleNext() {
    startTransition(async () => {
      let next = await getBattleThumbnails(offset)
      let newOffset = offset + 10
      // 끝까지 봤으면 처음으로 되돌아감
      if (next.length === 0) {
        next = await getBattleThumbnails(0)
        newOffset = 10
      }
      if (next.length > 0) {
        setBattles(next)
        setOffset(newOffset)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#EEF2FF' }}>
          <Shuffle size={20} color="#6366F1" />
        </div>
        <h3 className="font-bold text-base">랜덤 Better 보기</h3>
      </div>

      {/* 썸네일 목록 */}
      <ul className="flex-1 space-y-1.5">
        {battles.map((b) => (
          <li key={b.id}>
            <Link
              href={`/explore?id=${b.id}`}
              className="flex items-center gap-2.5 rounded-xl px-1 py-0.5 -mx-1 hover:bg-accent transition-colors"
            >
              <div className="flex shrink-0 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageAUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageBUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderLeft: '2px solid hsl(var(--card))' }} />
              </div>
              <span className="truncate text-sm text-muted-foreground">{b.title}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* 푸터 */}
      <div className="flex items-center justify-between">
        <Link href="/explore" className="text-xs font-bold" style={{ color: '#6366F1' }}>
          탐색하기 →
        </Link>
        <button
          onClick={handleNext}
          disabled={isPending}
          className="text-xs font-bold transition-opacity disabled:opacity-40"
          style={{ color: '#6366F1' }}
        >
          {isPending ? '로딩 중…' : '다음 10개 →'}
        </button>
      </div>
    </div>
  )
}
