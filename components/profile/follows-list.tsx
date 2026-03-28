'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { countryToFlag } from '@/lib/utils/country'
import { UserProfileModal } from '@/components/ui/user-profile-modal'
import type { FollowUserItem } from '@/app/api/user/profile/follows/route'

export function FollowsList({
  type,
  currentUserId,
}: {
  type: 'following' | 'followers'
  currentUserId: string
}) {
  const t = useTranslations()
  const [list, setList] = useState<FollowUserItem[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null)

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/user/profile/follows?type=${type}`)
      .then(r => r.json())
      .then((d: FollowUserItem[]) => { setList(d); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [type])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
            <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--color-muted)' }} className="animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '48px 0', textAlign: 'center',
        borderRadius: 20, border: '1.5px dashed var(--color-border)',
      }}>
        <p style={{ fontSize: '2rem', marginBottom: 8 }}>👥</p>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
          {type === 'following' ? t('profile.noFollowing') : t('profile.noFollowers')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {list.map((user, i) => (
          <button
            key={user.id}
            onClick={() => setProfileModalUserId(user.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '12px 0',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: i < list.length - 1 ? '1px solid var(--color-border)' : 'none',
              background: 'none', textAlign: 'left', cursor: 'pointer',
            }}
          >
            {user.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatarUrl}
                alt=""
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <span style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 900, color: 'white',
              }}>
                {(user.username[0] ?? '?').toUpperCase()}
              </span>
            )}
            {user.country && (
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{countryToFlag(user.country)}</span>
            )}
            <span style={{ flex: 1, fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-foreground)' }}>
              {user.username || '?'}
            </span>
          </button>
        ))}
      </div>
      {profileModalUserId && (
        <UserProfileModal
          userId={profileModalUserId}
          viewerUserId={currentUserId}
          onClose={() => setProfileModalUserId(null)}
        />
      )}
    </>
  )
}
