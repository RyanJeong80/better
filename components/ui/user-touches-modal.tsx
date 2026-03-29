'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { LevelBadge } from '@/components/ui/level-badge'
import { countryToFlag } from '@/lib/utils/country'
import { toggleFollow } from '@/actions/follows'
import type { PublicUserProfile } from '@/app/api/user/[id]/route'
import type { PublicBetterItem } from '@/app/api/user/[id]/betters/route'

function BetterCard({ better, onClose }: { better: PublicBetterItem; onClose: () => void }) {
  const t = useTranslations()
  const router = useRouter()
  return (
    <div
      onClick={() => { onClose(); router.push(`/?id=${better.id}`) }}
      style={{
        display: 'flex', gap: 12, padding: '14px 0',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
      }}
    >
      {better.isTextOnly ? (
        <div style={{
          width: 64, height: 64, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem',
        }}>
          📝
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={better.imageAUrl} alt="" style={{ width: 30, height: 64, borderRadius: '8px 0 0 8px', objectFit: 'cover' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={better.imageBUrl} alt="" style={{ width: 30, height: 64, borderRadius: '0 8px 8px 0', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {better.title}
        </p>
        <div style={{ display: 'flex', gap: 10, fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
          <span>{t('vote.totalVotes', { count: better.voteCount })}</span>
          <span>❤️ {better.likeCount}</span>
          {better.winner && <span>🏆 {better.winner}</span>}
        </div>
      </div>
    </div>
  )
}

export function UserTouchesModal({
  userId,
  viewerUserId,
  onClose,
}: {
  userId: string
  viewerUserId?: string | null
  onClose: () => void
}) {
  const t = useTranslations()
  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [betters, setBetters] = useState<PublicBetterItem[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [isFollowing, setIsFollowing] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    Promise.all([
      fetch(`/api/user/${userId}`).then(r => r.json()),
      fetch(`/api/user/${userId}/betters`).then(r => r.json()),
    ])
      .then(([p, b]: [PublicUserProfile, PublicBetterItem[]]) => {
        setProfile(p)
        setIsFollowing(p.isFollowing)
        setBetters(b)
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [userId])

  const handleFollow = () => {
    if (!viewerUserId || !profile) return
    startTransition(async () => {
      try {
        const result = await toggleFollow(userId)
        setIsFollowing(result.following)
        setProfile(prev => prev ? {
          ...prev,
          followerCount: prev.followerCount + (result.following ? 1 : -1),
        } : prev)
      } catch {}
    })
  }

  const isSelf = viewerUserId === userId
  const showFollowBtn = viewerUserId && !isSelf

  if (!mounted) return null

  const modal = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        backgroundColor: '#EDE4DA', zIndex: 10000,
        overflowY: 'auto', overscrollBehavior: 'contain',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: '#EDE4DA',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{ flex: 1, fontSize: '1.125rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile?.username || '...'}
        </h1>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-foreground)', flexShrink: 0 }}
        >
          <X size={22} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 60px' }}>
        {status === 'loading' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-muted)' }} className="animate-pulse" />
              <div style={{ flex: 1 }}>
                <div style={{ height: 18, width: 120, borderRadius: 6, background: 'var(--color-muted)', marginBottom: 8 }} className="animate-pulse" />
                <div style={{ height: 14, width: 80, borderRadius: 6, background: 'var(--color-muted)' }} className="animate-pulse" />
              </div>
            </div>
          </div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-muted-foreground)' }}>
            <p>{t('profile.loadError')}</p>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              {profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt=""
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <span style={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem', fontWeight: 900, color: 'white',
                }}>
                  {(profile.username[0] ?? '?').toUpperCase()}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>{profile.username || '?'}</span>
                  {profile.country && (
                    <span style={{ fontSize: '1.125rem' }}>{countryToFlag(profile.country)}</span>
                  )}
                </div>
                <LevelBadge level={profile.levelInfo} size="sm" />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              {[
                { label: t('follow.touchesLabel'), value: profile.battlesCount, unit: t('participation.unit') },
                { label: t('follow.votesLabel'), value: profile.totalVotes, unit: t('ranking.countUnit') },
                { label: t('follow.followersLabel'), value: profile.followerCount, unit: t('follow.personUnit') },
                { label: t('follow.followingLabel'), value: profile.followingCount, unit: t('follow.personUnit') },
              ].map(({ label, value, unit }, i, arr) => (
                <div
                  key={label}
                  style={{
                    flex: 1, padding: '12px 6px', textAlign: 'center',
                    borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : undefined,
                  }}
                >
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', margin: 0, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-foreground)', margin: 0 }}>
                    {value}<span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Follow button */}
            {showFollowBtn && (
              <button
                onClick={handleFollow}
                disabled={isPending}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', marginBottom: 24,
                  background: isFollowing ? '#F3F4F6' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  fontSize: '1rem', fontWeight: 700,
                  color: isFollowing ? '#374151' : 'white',
                  cursor: 'pointer', opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? '...' : isFollowing ? t('follow.following') : t('follow.follow')}
              </button>
            )}

            {/* Touches list */}
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 4, color: 'var(--color-muted-foreground)' }}>
              {t('follow.touchesLabel')} {betters.length}{t('participation.unit')}
            </h2>
            {betters.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: '0.875rem' }}>
                {t('profile.noBettersYet')}
              </div>
            ) : (
              <div>
                {betters.map(b => <BetterCard key={b.id} better={b} onClose={onClose} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
