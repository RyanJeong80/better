'use client'

import { useState } from 'react'
import { ChevronDown, Heart } from 'lucide-react'

interface Reason {
  choice: 'A' | 'B'
  reason: string
}

interface BattleStats {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  votesA: number
  votesB: number
  total: number
  reasons: Reason[]
  createdAt: Date
  likesCount: number
}

function ImageResult({
  imageUrl,
  description,
  votes,
  total,
  pct,
  side,
  isWinner,
}: {
  imageUrl: string
  description: string | null
  votes: number
  total: number
  pct: number
  side: 'A' | 'B'
  isWinner: boolean
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderLeft: side === 'B' ? '1px solid var(--color-border)' : undefined }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`사진 ${side}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {total > 0 ? (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 55%, transparent 80%)',
            }} />
            {isWinner && (
              <div style={{
                position: 'absolute', top: 8, right: 8, zIndex: 3,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white', fontSize: '0.65rem', fontWeight: 800,
                padding: '3px 10px', borderRadius: 999,
              }}>
                우세
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
              padding: '10px',
            }}>
              <p style={{ color: 'white', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>
                {pct}%
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', marginTop: 2 }}>
                {votes}명
              </p>
              <div style={{ marginTop: 6, height: 3, width: '100%', borderRadius: 999, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 999,
                  background: 'linear-gradient(90deg, #818CF8, #A78BFA)',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
          </>
        ) : (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 10,
            background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>아직 투표 없음</p>
          </div>
        )}
      </div>

      {description && (
        <p className="border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

export function MyBetterCard({ battle }: { battle: BattleStats }) {
  const [showReasons, setShowReasons] = useState(false)

  const pctA = battle.total > 0 ? Math.round((battle.votesA / battle.total) * 100) : 0
  const pctB = battle.total > 0 ? 100 - pctA : 0

  const aWins = battle.votesA > battle.votesB
  const bWins = battle.votesB > battle.votesA

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 px-4 py-4 md:px-5">
        <div className="min-w-0">
          <h3 className="font-bold leading-snug text-foreground">{battle.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {battle.total > 0 ? `총 ${battle.total}표` : '아직 투표가 없어요'}
          </p>
        </div>
        {battle.likesCount > 0 && (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1">
            <Heart size={12} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
            <span className="text-xs font-bold tabular-nums" style={{ color: '#F43F5E' }}>{battle.likesCount}</span>
          </div>
        )}
      </div>

      {/* 이미지 */}
      <div className="grid grid-cols-2 border-t border-border">
        <ImageResult
          imageUrl={battle.imageAUrl}
          description={battle.imageADescription}
          votes={battle.votesA}
          total={battle.total}
          pct={pctA}
          side="A"
          isWinner={aWins}
        />
        <ImageResult
          imageUrl={battle.imageBUrl}
          description={battle.imageBDescription}
          votes={battle.votesB}
          total={battle.total}
          pct={pctB}
          side="B"
          isWinner={bWins}
        />
      </div>

      {/* 이유 보기 */}
      {battle.reasons.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowReasons((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-accent md:px-5"
          >
            <span className="text-muted-foreground">이유 보기</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {battle.reasons.length}
              </span>
              <ChevronDown
                size={15}
                className={`text-muted-foreground transition-transform duration-200 ${showReasons ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {showReasons && (
            <ul className="divide-y divide-border border-t border-border">
              {battle.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3 md:px-5">
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      r.choice === 'A'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {r.choice}
                  </span>
                  <p className="text-sm text-foreground/80">{r.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
