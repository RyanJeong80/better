'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LogIn } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { updateCountry } from '@/actions/users'
import { LevelBadge } from '@/components/ui/level-badge'
import { LevelUpToast } from '@/components/profile/level-up-toast'
import { UsernameEditor } from '@/components/profile/username-editor'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { ProfileBetterList } from '@/components/profile/profile-better-list'
import { FollowsList } from '@/components/profile/follows-list'
import { VotedBetterList } from '@/components/profile/voted-better-list'
import { LikedBetterList } from '@/components/profile/liked-better-list'
import { CATEGORY_LABELS } from '@/lib/level'
import { COUNTRY_OPTIONS, countryToFlag } from '@/lib/utils/country'
import type { UserInfo } from '@/app/(main)/page'
import type { UserProfileData } from '@/app/api/user/profile/route'
import type { BattleWithStats } from '@/components/profile/profile-better-list'

type ProfileTab = 'touches' | 'voted' | 'liked' | 'following' | 'followers'

function Skeleton() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-muted)' }} className="animate-pulse" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 18, width: 120, borderRadius: 6, background: 'var(--color-muted)', marginBottom: 8 }} className="animate-pulse" />
          <div style={{ height: 14, width: 80, borderRadius: 6, background: 'var(--color-muted)' }} className="animate-pulse" />
        </div>
      </div>
      <div style={{ height: 100, borderRadius: 16, background: 'var(--color-muted)', marginBottom: 16 }} className="animate-pulse" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 12, background: 'var(--color-muted)' }} className="animate-pulse" />
        ))}
      </div>
    </div>
  )
}

type VirtualUserSession = { id: string; name: string; country: string | null }

export function ProfilePanelClient({ user }: { user: UserInfo | null }) {
  const t = useTranslations()
  const [data, setData] = useState<UserProfileData | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [country, setCountry] = useState<string | null>(null)
  const [countryEditing, setCountryEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('touches')
  const [followingCount, setFollowingCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [virtualUser, setVirtualUser] = useState<VirtualUserSession | null>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  // 가상 유저 감지
  useEffect(() => {
    const sync = () => {
      try {
        const raw = sessionStorage.getItem('admin_virtual_user')
        setVirtualUser(raw ? JSON.parse(raw) : null)
      } catch { setVirtualUser(null) }
    }
    sync()
    window.addEventListener('adminUserChanged', sync)
    return () => window.removeEventListener('adminUserChanged', sync)
  }, [])

  // 실제 유저 프로필 fetch
  useEffect(() => {
    if (!user) { setStatus('done'); return }
    fetch('/api/user/profile')
      .then(r => r.json())
      .then((d: UserProfileData) => {
        setData(d)
        setCountry(d.country)
        setFollowingCount(Number(d.followingCount) || 0)
        setFollowerCount(Number(d.followerCount) || 0)
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [user])

  // 가상 유저 프로필 fetch
  useEffect(() => {
    if (user || !virtualUser) return
    setStatus('loading')
    setData(null)
    const pw = sessionStorage.getItem('admin_password') ?? ''
    fetch(`/api/admin/profile?userId=${virtualUser.id}`, {
      headers: { Authorization: `Bearer ${pw}` },
    })
      .then(r => r.json())
      .then((d: UserProfileData) => {
        setData(d)
        setCountry(d.country)
        setFollowingCount(Number(d.followingCount) || 0)
        setFollowerCount(Number(d.followerCount) || 0)
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [user, virtualUser])

  const isVirtualMode = !user && !!virtualUser

  if (!user && !virtualUser) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', gap: 16,
      }}>
        <span style={{ fontSize: '3rem' }}>👤</span>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>{t('auth.loginRequired')}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-foreground)' }}>{t('auth.loginToSeeProfile')}</p>
        </div>
        <Link
          href="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: 'white', fontWeight: 700, fontSize: '0.9rem',
            padding: '12px 28px', borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          <LogIn size={16} />
          {t('auth.login')}
        </Link>
      </div>
    )
  }

  if (status === 'loading') return <Skeleton />

  if (!data) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-muted-foreground)' }}>
        <p>{t('profile.loadError')}</p>
      </div>
    )
  }

  const battles: BattleWithStats[] = data.battles.map(b => ({
    ...b,
    createdAt: new Date(b.createdAt),
    closedAt: b.closedAt ? new Date(b.closedAt) : null,
    winner: b.winner,
  }))

  return (
    <div style={{ padding: '16px 16px 60px', overflowY: 'auto' }}>
      <LevelUpToast
        currentLevel={data.levelInfo.level}
        levelName={data.levelInfo.levelName}
        emoji={data.levelInfo.emoji}
      />

      {/* 유저 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isVirtualMode ? (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B35, #F7C59F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {data.initial}
            </div>
          ) : (
            <AvatarUpload
              currentAvatarUrl={data.avatarUrl}
              initial={data.initial}
              size={52}
            />
          )}
          <div>
            {isVirtualMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#3D2B1F' }}>{data.username}</span>
                <span style={{ fontSize: 10, background: '#FF6B35', color: '#fff', borderRadius: 6, padding: '1px 6px', fontWeight: 700 }}>가상유저</span>
              </div>
            ) : (
              <UsernameEditor currentUsername={data.username} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <LevelBadge level={data.levelInfo} size="xs" />
              {/* 국적 표시/편집 */}
              {isVirtualMode ? (
                country && (
                  <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    {countryToFlag(country)} {COUNTRY_OPTIONS.find(c => c.code === country)?.name ?? country}
                  </span>
                )
              ) : countryEditing ? (
                <select
                  ref={selectRef}
                  defaultValue={country ?? ''}
                  autoFocus
                  onBlur={async (e) => {
                    const val = e.target.value || null
                    setCountry(val)
                    setCountryEditing(false)
                    await updateCountry(val)
                  }}
                  onChange={async (e) => {
                    const val = e.target.value || null
                    setCountry(val)
                    setCountryEditing(false)
                    await updateCountry(val)
                  }}
                  style={{
                    fontSize: '0.875rem', borderRadius: 6, border: '1px solid #E5E7EB',
                    padding: '1px 4px', background: 'white', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="">국적 없음</option>
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.code} value={c.code}>
                      {countryToFlag(c.code)} {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setCountryEditing(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: 'none', border: '1px dashed #D4C4B0', borderRadius: 6,
                    padding: '1px 6px', cursor: 'pointer', fontSize: '0.875rem', color: '#6B7280',
                  }}
                >
                  {country ? (
                    <><span style={{ fontSize: '1rem' }}>{countryToFlag(country)}</span> {COUNTRY_OPTIONS.find(c => c.code === country)?.name ?? country}</>
                  ) : (
                    '+ 국적'
                  )}
                </button>
              )}
              {data.bestCat && (
                <span style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
                  {CATEGORY_LABELS[data.bestCat.key].emoji}{' '}
                  {t('profile.expertBadge', { category: t(`categories.${data.bestCat.key}` as Parameters<typeof t>[0]) })}
                </span>
              )}
            </div>
          </div>
        </div>
        {!isVirtualMode && (
          <form action={signOut}>
            <button
              type="submit"
              style={{
                padding: '4px 8px', borderRadius: 999, fontSize: '9px', fontWeight: 700,
                border: '1.5px solid #3D2B1F', background: 'transparent',
                cursor: 'pointer', color: '#3D2B1F', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {t('auth.logout')}
            </button>
          </form>
        )}
      </div>

      {/* 레벨 카드 */}
      <div style={{
        borderRadius: 20, padding: '16px 18px', marginBottom: 14,
        background: `linear-gradient(135deg, ${data.levelInfo.bgColor}, white)`,
        border: `1.5px solid ${data.levelInfo.color}30`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>{data.levelInfo.emoji}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: data.levelInfo.color, letterSpacing: '0.06em', marginBottom: 4 }}>
              Lv.{data.levelInfo.level} · {data.levelInfo.levelName}
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>{t('profile.totalVotesLabel')}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: data.levelInfo.color, lineHeight: 1.1, margin: 0 }}>
                  {data.totalVotes}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('ranking.countUnit')}</span>
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>{t('profile.accuracy')}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: data.levelInfo.color, lineHeight: 1.1, margin: 0 }}>
                  {data.accuracyRate != null ? `${data.accuracyRate.toFixed(1)}%` : '-'}
                </p>
              </div>
              {data.bestCat && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>{t('profile.specialtyLabel')}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: data.levelInfo.color, lineHeight: 1.1, margin: 0 }}>
                    {CATEGORY_LABELS[data.bestCat.key].emoji}
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, marginLeft: 2 }}>
                      {data.bestCat.value.toFixed(0)}%
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 카테고리별 적중률 */}
        {data.catAccuracies.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {[...data.catAccuracies]
              .sort((a, b) => b.value - a.value)
              .map(c => (
                <span
                  key={c.key}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '2px 7px', borderRadius: 999,
                    background: 'white', border: `1px solid ${data.levelInfo.color}30`,
                    fontSize: '0.875rem', fontWeight: 700, color: '#374151',
                  }}
                >
                  {CATEGORY_LABELS[c.key].emoji}
                  <span style={{ color: '#6B7280' }}>{t(`categories.${c.key}` as Parameters<typeof t>[0])}</span>
                  <span style={{ color: data.levelInfo.color }}>{c.value.toFixed(0)}%</span>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* 요약 통계 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: t('profile.myBetters'), value: t('profile.betterCountValue', { count: battles.length }) },
          { label: t('profile.totalVotesLabel'), value: t('profile.totalVotesValue', { count: data.battlesVoteTotal }) },
          { label: t('profile.likesLabel'), value: `${data.battlesLikesTotal}` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            borderRadius: 14, border: '1px solid var(--color-border)',
            background: 'var(--color-card)', padding: '12px 10px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', margin: 0 }}>{label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-foreground)', margin: '4px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 탭 버튼 */}
      {(() => {
        const tabs: { id: ProfileTab; label: string }[] = isVirtualMode
          ? [{ id: 'touches', label: t('profile.myTouchesTab') }]
          : [
              { id: 'touches',   label: t('profile.myTouchesTab') },
              { id: 'voted',     label: t('profile.votedTouchesTab') },
              { id: 'liked',     label: t('profile.likedTouchesTab') },
              { id: 'following', label: `${t('profile.followingTab')} ${followingCount}` },
              { id: 'followers', label: `${t('profile.followersTab')} ${followerCount}` },
            ]
        return (
          <div style={{
            display: 'flex',
            backgroundColor: '#D4C4B0',
            borderRadius: '12px',
            padding: '4px',
            margin: '0 0 16px',
            gap: '4px',
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeTab === tab.id ? '#3D2B1F' : 'rgba(61,43,31,0.5)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )
      })()}

      {activeTab === 'touches' && <ProfileBetterList battles={battles} />}
      {activeTab === 'voted' && <VotedBetterList />}
      {activeTab === 'liked' && <LikedBetterList />}
      {activeTab === 'following' && <FollowsList type="following" currentUserId={data.userId} onCount={setFollowingCount} />}
      {activeTab === 'followers' && <FollowsList type="followers" currentUserId={data.userId} onCount={setFollowerCount} />}

      {/* 푸터 링크 */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <Link
          href="/privacy"
          style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {t('privacy.linkLabel')}
        </Link>
      </div>
    </div>
  )
}
