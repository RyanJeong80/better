'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ArrowLeft, Heart, Send, User } from 'lucide-react'
import { submitVote } from '@/actions/votes'
import { addComment } from '@/actions/comments'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'
import type { PanelHotEntry } from '@/app/api/panels/hot/route'
import type { BetterDetailData } from '@/app/api/battles/[id]/detail/route'

const CAT_COLOR: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#DBEAFE', text: '#1D4ED8' },
  appearance: { bg: '#FCE7F3', text: '#9D174D' },
  love:       { bg: '#FFE4E6', text: '#BE123C' },
  shopping:   { bg: '#FEF3C7', text: '#B45309' },
  food:       { bg: '#FFEDD5', text: '#C2410C' },
  it:         { bg: '#EDE9FE', text: '#6D28D9' },
  decision:   { bg: '#DCFCE7', text: '#15803D' },
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}일 전`
  return new Date(isoStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function BetterDetailModal({
  entry,
  onClose,
}: {
  entry: PanelHotEntry
  onClose: () => void
}) {
  const [detail, setDetail] = useState<BetterDetailData | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [votedChoice, setVotedChoice] = useState<'A' | 'B' | null>(null)
  const [barFilled, setBarFilled] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentPending, startCommentTransition] = useTransition()
  const [votePending, setVotePending] = useState(false)
  const [mounted, setMounted] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    // Lock body scroll while modal is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Fetch detail data
  useEffect(() => {
    fetch(`/api/battles/${entry.id}/detail`)
      .then(r => r.json())
      .then((data: BetterDetailData) => {
        setDetail(data)
        setVotedChoice(data.userVote)
        setLoadStatus('done')
        if (data.userVote) {
          requestAnimationFrame(() => setBarFilled(true))
        }
      })
      .catch(() => setLoadStatus('error'))
  }, [entry.id])

  const hasVoted = !!votedChoice
  const voteCounts = detail?.voteCounts ?? { A: 0, B: 0, total: 0 }
  const pctA = voteCounts.total > 0 ? Math.round((voteCounts.A / voteCounts.total) * 100) : 0
  const pctB = voteCounts.total > 0 ? Math.round((voteCounts.B / voteCounts.total) * 100) : 0
  const isAWinning = voteCounts.A >= voteCounts.B
  const isBWinning = voteCounts.B > voteCounts.A

  const handleVote = async (choice: 'A' | 'B') => {
    if (hasVoted || votePending || loadStatus !== 'done') return
    setVotePending(true)
    const result = await submitVote(entry.id, choice)
    setVotePending(false)
    if ('error' in result) return
    setVotedChoice(choice)
    setDetail(prev => prev ? {
      ...prev,
      voteCounts: {
        A: prev.voteCounts.A + (choice === 'A' ? 1 : 0),
        B: prev.voteCounts.B + (choice === 'B' ? 1 : 0),
        total: prev.voteCounts.total + 1,
      },
    } : prev)
    requestAnimationFrame(() => setBarFilled(true))
  }

  const handleComment = () => {
    if (!commentText.trim() || commentPending) return
    const text = commentText
    setCommentText('')
    startCommentTransition(async () => {
      const result = await addComment(entry.id, text)
      if ('success' in result) {
        // Refetch to get updated comments with user info
        const data: BetterDetailData = await fetch(`/api/battles/${entry.id}/detail`).then(r => r.json())
        setDetail(data)
        setVotedChoice(prev => data.userVote ?? prev)
      }
    })
  }

  const cat = CATEGORY_MAP[entry.category]
  const catColor = CAT_COLOR[entry.category]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'var(--color-background)',
        display: 'flex', flexDirection: 'column',
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
    >
      {/* ── 헤더 ── */}
      <div style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        paddingLeft: 4, paddingRight: 16, gap: 4,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
        zIndex: 1,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 44, height: 44, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-foreground)',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <p style={{
          flex: 1, margin: 0,
          fontSize: '0.9rem', fontWeight: 700,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {entry.title}
        </p>
      </div>

      {/* ── 스크롤 바디 ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* A 사진 */}
        <div
          onClick={() => handleVote('A')}
          style={{
            position: 'relative', height: '42vh',
            cursor: hasVoted ? 'default' : 'pointer',
            overflow: 'hidden', background: '#000',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.imageAUrl}
            alt="A"
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              filter: hasVoted ? (isAWinning ? 'brightness(1.08)' : 'brightness(0.5)') : undefined,
              transition: 'filter 0.5s ease',
            }}
          />
          {/* A 라벨 */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            color: 'white', fontSize: '0.7rem', fontWeight: 800,
            padding: '3px 8px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>A</div>

          {/* 투표 전 탭 힌트 */}
          {!hasVoted && !votePending && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                color: 'white', fontSize: '0.82rem', fontWeight: 700,
                padding: '8px 20px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                pointerEvents: 'none',
              }}>A 선택</span>
            </div>
          )}

          {/* 로딩 중 */}
          {votePending && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} />
          )}

          {/* 결과 오버레이 */}
          {hasVoted && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              opacity: barFilled ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}>
              <span style={{
                fontSize: '3rem', fontWeight: 900,
                color: 'white', lineHeight: 1,
                textShadow: '0 2px 16px rgba(0,0,0,0.7)',
              }}>
                {pctA}%
              </span>
              {votedChoice === 'A' && (
                <span style={{
                  marginTop: 10,
                  background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)',
                  color: 'white', fontSize: '0.75rem', fontWeight: 700,
                  padding: '4px 12px', borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.3)',
                }}>내 선택 ✓</span>
              )}
            </div>
          )}
        </div>

        {/* VS 구분선 */}
        <div style={{
          height: 40, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 1,
            background: 'rgba(255,255,255,0.12)',
          }} />
          <div style={{
            background: '#111', border: '1.5px solid rgba(255,255,255,0.2)',
            borderRadius: 999, padding: '5px 16px',
            display: 'flex', alignItems: 'center', gap: 8, zIndex: 1, position: 'relative',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>VS</span>
            {hasVoted && (
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem' }}>
                총 {voteCounts.total}표
              </span>
            )}
          </div>
        </div>

        {/* B 사진 */}
        <div
          onClick={() => handleVote('B')}
          style={{
            position: 'relative', height: '42vh',
            cursor: hasVoted ? 'default' : 'pointer',
            overflow: 'hidden', background: '#000',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.imageBUrl}
            alt="B"
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              filter: hasVoted ? (isBWinning ? 'brightness(1.08)' : 'brightness(0.5)') : undefined,
              transition: 'filter 0.5s ease',
            }}
          />
          {/* B 라벨 */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            color: 'white', fontSize: '0.7rem', fontWeight: 800,
            padding: '3px 8px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>B</div>

          {/* 투표 전 탭 힌트 */}
          {!hasVoted && !votePending && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                color: 'white', fontSize: '0.82rem', fontWeight: 700,
                padding: '8px 20px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                pointerEvents: 'none',
              }}>B 선택</span>
            </div>
          )}

          {/* 결과 오버레이 */}
          {hasVoted && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              opacity: barFilled ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}>
              <span style={{
                fontSize: '3rem', fontWeight: 900,
                color: 'white', lineHeight: 1,
                textShadow: '0 2px 16px rgba(0,0,0,0.7)',
              }}>
                {pctB}%
              </span>
              {votedChoice === 'B' && (
                <span style={{
                  marginTop: 10,
                  background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)',
                  color: 'white', fontSize: '0.75rem', fontWeight: 700,
                  padding: '4px 12px', borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.3)',
                }}>내 선택 ✓</span>
              )}
            </div>
          )}
        </div>

        {/* ── 정보 + 댓글 ── */}
        <div style={{ padding: '16px 16px 40px' }}>

          {/* 메타 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: catColor.bg, color: catColor.text,
              padding: '4px 10px', borderRadius: 999,
              fontSize: '0.72rem', fontWeight: 700,
            }}>
              {cat.emoji} {cat.label}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: '0.75rem', color: 'var(--color-muted-foreground)',
            }}>
              <Heart size={12} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
              {entry.likeCount}
            </span>
          </div>

          {/* 댓글 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14, paddingBottom: 12,
            borderBottom: '1px solid var(--color-border)',
          }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>
              댓글
              {loadStatus === 'done' && (
                <span style={{ marginLeft: 6, color: 'var(--color-muted-foreground)', fontWeight: 500 }}>
                  {detail?.comments.length ?? 0}
                </span>
              )}
            </h3>
          </div>

          {/* 댓글 입력 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment() }
              }}
              placeholder="댓글을 입력하세요..."
              maxLength={500}
              style={{
                flex: 1, padding: '9px 14px',
                borderRadius: 999, border: '1.5px solid var(--color-border)',
                fontSize: '0.82rem', background: 'var(--color-muted)',
                outline: 'none', color: 'var(--color-foreground)',
              }}
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || commentPending}
              style={{
                width: 38, height: 38, flexShrink: 0,
                borderRadius: '50%', border: 'none',
                cursor: commentText.trim() && !commentPending ? 'pointer' : 'not-allowed',
                background: commentText.trim() && !commentPending
                  ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                  : 'var(--color-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <Send size={15} color={commentText.trim() && !commentPending ? 'white' : '#9CA3AF'} />
            </button>
          </div>

          {/* 댓글 목록 */}
          {loadStatus === 'loading' ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#6366F1', animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : loadStatus === 'error' ? (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-muted-foreground)', padding: '24px 0' }}>
              불러오기 실패
            </p>
          ) : detail?.comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-muted-foreground)' }}>
              <p style={{ fontSize: '1.6rem', marginBottom: 6 }}>💬</p>
              <p style={{ fontSize: '0.82rem' }}>첫 댓글을 남겨보세요</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {detail?.comments.map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {/* 아바타 */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {comment.userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comment.userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={14} color="white" />
                    )}
                  </div>
                  {/* 내용 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        {comment.userName ?? '익명'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-muted-foreground)' }}>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p style={{
                      margin: 0, fontSize: '0.83rem', lineHeight: 1.55,
                      color: 'var(--color-foreground)', wordBreak: 'break-word',
                    }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
