'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

type Ranker = { name: string; participated: number }

export function RankingCard() {
  const ref = useRef<HTMLAnchorElement>(null)
  const [rankers, setRankers] = useState<Ranker[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded) {
          setLoaded(true)
          fetch('/api/home/ranking')
            .then((r) => r.json())
            .then((d: Ranker[]) => setRankers(d))
            .catch(() => setRankers([]))
        }
      },
      { rootMargin: '200px' },
    )
    const el = ref.current
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [loaded])

  return (
    <Link
      ref={ref}
      href="/ranking"
      className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#F5F3FF' }}>
          <Trophy size={20} color="#8B5CF6" />
        </div>
        <h3 className="font-bold text-base">Better 랭킹</h3>
      </div>

      <ul className="flex-1 space-y-2">
        {!loaded ? (
          Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="w-4 shrink-0" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 w-8 animate-pulse rounded bg-muted" />
            </li>
          ))
        ) : rankers.length === 0 ? (
          <li className="py-2 text-center text-xs text-muted-foreground">아직 데이터가 없어요</li>
        ) : (
          rankers.map((r, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span
                className="w-4 shrink-0 text-center text-xs font-black"
                style={{ color: i === 0 ? '#D97706' : i === 1 ? '#9CA3AF' : '#B45309' }}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm font-semibold">{r.name}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: '#8B5CF6' }}>
                {r.participated}건
              </span>
            </li>
          ))
        )}
      </ul>

      <span className="mt-auto text-xs font-bold" style={{ color: '#8B5CF6' }}>
        랭킹 더보기 →
      </span>
    </Link>
  )
}
