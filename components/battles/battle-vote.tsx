'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { castVote } from '@/actions/votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { ShareButton } from './share-button'
import type { VoteChoice } from '@/types'

interface Props {
  battleId: string
  title: string
  imageAUrl: string
  imageBUrl: string
  counts: { A: number; B: number; total: number }
  userVote: VoteChoice | null
  readOnly?: boolean
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
}

export function BattleVote({
  battleId, title, imageAUrl, imageBUrl,
  counts, userVote, readOnly = false,
  isTextOnly, imageAText, imageBText,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('vote')
  const live = useRealtimeVotes(battleId, counts)

  const hasVoted = readOnly || userVote !== null
  const pctA = live.total > 0 ? Math.round((live.A / live.total) * 100) : 0
  const pctB = live.total > 0 ? Math.round((live.B / live.total) * 100) : 0

  const handleVote = (choice: VoteChoice) => {
    if (readOnly) return
    startTransition(async () => {
      await castVote(battleId, choice)
    })
  }

  const winner = live.A > live.B ? 'A' : live.B > live.A ? 'B' : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {(['A', 'B'] as VoteChoice[]).map((choice) => {
          const imageUrl = choice === 'A' ? imageAUrl : imageBUrl
          const pct = choice === 'A' ? pctA : pctB
          const isChosen = !readOnly && userVote === choice
          const isWinner = winner === choice

          return (
            <button
              key={choice}
              onClick={() => !hasVoted && handleVote(choice)}
              disabled={hasVoted || isPending}
              className={[
                'group relative overflow-hidden rounded-xl border-2 transition-all',
                !hasVoted && 'hover:border-primary cursor-pointer',
                isChosen ? 'border-primary' : 'border-border',
                (hasVoted && !isChosen && !readOnly) ? 'opacity-60' : '',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={choice}
                className="aspect-square w-full object-cover"
              />

              {/* 결과 오버레이 */}
              {hasVoted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
                  {/* 퍼센트 */}
                  <span className="text-white font-black drop-shadow" style={{ fontSize: '2.2rem', lineHeight: 1 }}>
                    {pct}%
                  </span>
                  {isWinner && (
                    <span className="mt-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                      {t('winning')}
                    </span>
                  )}
                  {/* 바 */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="mb-1 flex justify-between text-white/80 text-xs font-medium">
                      <span>{choice}</span>
                      <span>{t('voterCount', { count: choice === 'A' ? live.A : live.B })}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/30">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {isChosen && (
                <div className="absolute top-3 right-3 rounded-full bg-primary p-1">
                  <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {!hasVoted && (
        <p className="text-center text-sm text-muted-foreground">
          {t('clickToVote')}
        </p>
      )}

      {hasVoted && (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            {t('totalVotes', { count: live.total })}
          </p>
          <div className="flex justify-center">
            <ShareButton
              battleId={battleId}
              title={title}
              imageAUrl={imageAUrl}
              imageBUrl={imageBUrl}
              pctA={pctA}
              pctB={pctB}
              total={live.total}
              winner={winner}
              isTextOnly={isTextOnly}
              imageAText={imageAText}
              imageBText={imageBText}
            />
          </div>
        </div>
      )}
    </div>
  )
}
