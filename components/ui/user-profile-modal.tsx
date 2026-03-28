'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { LevelBadge } from '@/components/ui/level-badge'
import { countryToFlag } from '@/lib/utils/country'
import type { PublicUserProfile } from '@/app/api/user/[id]/route'

export function UserProfileModal({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    fetch(`/api/user/${userId}`)
      .then(r => r.json())
      .then((d: PublicUserProfile) => { setProfile(d); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [userId])

  if (!mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div
        style={{
          position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 480, padding: '20px 24px 48px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: '#D4C4B0' }} />
        </div>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}
        >
          <X size={20} />
        </button>

        {status === 'loading' ? (
          <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="animate-pulse"
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4C4B0', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : !profile ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
            프로필을 불러올 수 없어요
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {profile.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.avatarUrl}
                alt=""
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <span style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 900, color: 'white',
              }}>
                {(profile.username[0] ?? '?').toUpperCase()}
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {profile.country && (
                  <span style={{ fontSize: '1.1rem' }}>{countryToFlag(profile.country)}</span>
                )}
                <span style={{ fontWeight: 800, fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.username}
                </span>
              </div>
              <LevelBadge level={profile.levelInfo} size="sm" />
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#9CA3AF', margin: 0 }}>투표</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: '#3D2B1F', margin: 0, lineHeight: 1.1 }}>
                    {profile.totalVotes}<span style={{ fontSize: '0.62rem', fontWeight: 600 }}>회</span>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#9CA3AF', margin: 0 }}>터치</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: '#3D2B1F', margin: 0, lineHeight: 1.1 }}>
                    {profile.battlesCount}<span style={{ fontSize: '0.62rem', fontWeight: 600 }}>개</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
