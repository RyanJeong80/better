'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LevelBadge } from '@/components/ui/level-badge'
import { countryToFlag } from '@/lib/utils/country'
import { toggleFollow } from '@/actions/follows'
import type { PublicUserProfile } from '@/app/api/user/[id]/route'

export function UserProfileModal({
  userId,
  viewerUserId,
  onClose,
  onViewTouches,
}: {
  userId: string
  viewerUserId?: string | null
  onClose: () => void
  onViewTouches?: (userId: string) => void
}) {
  const t = useTranslations()
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [isFollowing, setIsFollowing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/user/${userId}`)
      .then(r => r.json())
      .then((d: PublicUserProfile) => {
        setProfile(d)
        setIsFollowing(d.isFollowing)
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
      } catch {
        // ignore
      }
    })
  }

  const isSelf = viewerUserId === userId
  const showFollowBtn = viewerUserId && !isSelf

  if (!mounted) return null

  const portal = createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div
        style={{
          position: 'relative', background: 'var(--color-card)', borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: 480, paddingBottom: 48,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#D4C4B0' }} />
        </div>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 4 }}
        >
          <X size={20} />
        </button>

        {status === 'loading' ? (
          <div style={{ padding: '32px 24px', display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="animate-pulse"
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4C4B0', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : !profile ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>
            {t('profile.loadError')}
          </div>
        ) : (
          <div style={{ padding: '12px 24px 0' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.username || '?'}
                  </span>
                  {profile.country && (
                    <span style={{ fontSize: '1.125rem' }}>{countryToFlag(profile.country)}</span>
                  )}
                </div>
                <LevelBadge level={profile.levelInfo} size="sm" />
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              {[
                { label: t('follow.votesLabel'), value: profile.totalVotes, unit: t('ranking.countUnit') },
                { label: t('follow.touchesLabel'), value: profile.battlesCount, unit: t('participation.unit') },
                { label: t('follow.followersLabel'), value: profile.followerCount, unit: t('follow.personUnit') },
                { label: t('follow.followingLabel'), value: profile.followingCount, unit: t('follow.personUnit') },
              ].map(({ label, value, unit }, i, arr) => (
                <div
                  key={label}
                  style={{
                    flex: 1, padding: '10px 6px', textAlign: 'center',
                    borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : undefined,
                  }}
                >
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', margin: 0, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-foreground)', margin: 0 }}>
                    {value}<span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{unit}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { onClose(); onViewTouches?.(userId) }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '12px 0', borderRadius: 14,
                  border: '1.5px solid #3D2B1F',
                  background: 'transparent',
                  fontSize: '1rem', fontWeight: 700, color: '#3D2B1F',
                  cursor: 'pointer',
                }}
              >
                {t('follow.viewTouches')}
              </button>
              {showFollowBtn && (
                <button
                  onClick={handleFollow}
                  disabled={isPending}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 14, border: 'none',
                    background: isFollowing ? '#F3F4F6' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    fontSize: '1rem', fontWeight: 700,
                    color: isFollowing ? '#374151' : 'white',
                    cursor: 'pointer', opacity: isPending ? 0.7 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {isPending ? '...' : isFollowing ? t('follow.following') : t('follow.follow')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )

  return portal
}

