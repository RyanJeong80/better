'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Flame, ArrowUpDown } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'
import type { PanelHotEntry } from '@/app/api/panels/hot/route'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'
import { countryToFlag } from '@/lib/utils/country'
import { UserProfileModal } from '@/components/ui/user-profile-modal'

const CAT_COLOR: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#DBEAFE', text: '#1D4ED8' },
  appearance: { bg: '#FCE7F3', text: '#9D174D' },
  love:       { bg: '#FFE4E6', text: '#BE123C' },
  shopping:   { bg: '#FEF3C7', text: '#B45309' },
  food:       { bg: '#FFEDD5', text: '#C2410C' },
  it:         { bg: '#EDE9FE', text: '#6D28D9' },
  decision:   { bg: '#DCFCE7', text: '#15803D' },
}

const RANK_STYLE: Record<number, { bg: string; color: string }> = {
  1: { bg: '#F59E0B', color: 'white' },
  2: { bg: '#9CA3AF', color: 'white' },
  3: { bg: '#B45309', color: 'white' },
}

type SortOrder = 'popular' | 'recent'

type CategoryTabKey = CategoryFilter

const CATEGORY_TAB_KEYS: CategoryTabKey[] = [
  'all', 'fashion', 'appearance', 'love', 'shopping', 'food', 'it', 'decision',
]

function SkeletonItem() {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ paddingTop: '56.25%', borderRadius: 12, background: 'var(--color-muted)', position: 'relative', overflow: 'hidden' }} className="animate-pulse" />
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, borderRadius: 4, background: 'var(--color-muted)', marginBottom: 6 }} className="animate-pulse" />
          <div style={{ height: 14, borderRadius: 4, background: 'var(--color-muted)', width: '75%', marginBottom: 6 }} className="animate-pulse" />
          <div style={{ height: 11, borderRadius: 4, background: 'var(--color-muted)', width: '40%' }} className="animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '12px 12px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-muted)', flexShrink: 0 }} className="animate-pulse" />
        <div style={{ width: 140, height: 18, borderRadius: 6, background: 'var(--color-muted)' }} className="animate-pulse" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)}
    </div>
  )
}

const PAGE_SIZE = 10

type TranslatedEntry = { title: string; imageAText: string | null; imageBText: string | null }

export function HotPanelClient({
  onSelectBattle,
}: {
  onSelectBattle?: (entry: PanelHotEntry) => void
}) {
  const t = useTranslations()
  const locale = useLocale()
  const [entries, setEntries] = useState<PanelHotEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('popular')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [translations, setTranslations] = useState<Map<string, TranslatedEntry>>(new Map())

  useEffect(() => {
    fetch('/api/panels/hot')
      .then(r => r.json())
      .then((data: PanelHotEntry[]) => { setEntries(data); setStatus('done') })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    if (locale === 'ko' || entries.length === 0) return
    const texts = entries.flatMap(e => [e.title, e.imageAText ?? '', e.imageBText ?? ''])
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, target: locale }),
    })
      .then(r => r.json())
      .then(({ translations: tr }: { translations: string[] }) => {
        const map = new Map<string, TranslatedEntry>()
        entries.forEach((e, i) => {
          map.set(e.id, {
            title: tr[i * 3] || e.title,
            imageAText: tr[i * 3 + 1] || e.imageAText,
            imageBText: tr[i * 3 + 2] || e.imageBText,
          })
        })
        setTranslations(map)
      })
      .catch(() => {})
  }, [entries, locale])

  const filtered = useMemo(() => {
    const base = category === 'all' ? entries : entries.filter(e => e.category === category)
    if (sortOrder === 'recent') {
      return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return [...base].sort((a, b) => b.likeCount - a.likeCount)
  }, [entries, category, sortOrder])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [category, sortOrder])

  useEffect(() => {
    if (status !== 'done' || visibleCount >= filtered.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [status, visibleCount, filtered.length])

  if (status === 'loading') return <Skeleton />

  const tabLabel = (key: CategoryTabKey) =>
    key === 'all'
      ? t('categories.all')
      : t(`categories.${key}Short` as Parameters<typeof t>[0])

  const categoryLabel = (key: CategoryFilter) =>
    key === 'all'
      ? t('categories.all')
      : t(`categories.${key}` as Parameters<typeof t>[0])

  return (
    <div style={{ padding: '12px 12px 40px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame size={18} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.08rem', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>Hot Touched</h2>
          <p style={{ fontSize: '0.80rem', color: 'var(--color-muted-foreground)', margin: '2px 0 0' }}>
            {t('hot.subtitle')}
          </p>
        </div>
        {/* 정렬 토글 */}
        <button
          onClick={() => setSortOrder(prev => prev === 'popular' ? 'recent' : 'popular')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#D4C4B0',
            border: 'none', cursor: 'pointer',
            borderRadius: 999, padding: '5px 10px',
            fontSize: '0.72rem', fontWeight: 700,
            color: '#3D2B1F',
            flexShrink: 0,
          }}
        >
          <ArrowUpDown size={11} />
          {sortOrder === 'popular' ? t('hot.popular') : t('hot.recent')}
        </button>
      </div>

      {/* 카테고리 필터 탭 */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16,
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {CATEGORY_TAB_KEYS.map(key => {
          const active = category === key
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              style={{
                flexShrink: 0,
                padding: '5px 12px',
                borderRadius: 999,
                border: 'none',
                background: active ? '#3D2B1F' : '#D4C4B0',
                color: active ? '#ffffff' : '#3D2B1F',
                fontSize: '0.83rem', fontWeight: active ? 800 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tabLabel(key)}
            </button>
          )
        })}
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 16, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔥</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>{t('hot.noLikes')}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            {t('hot.noLikesDesc')}
          </p>
        </div>
      ) : (
        <div>
          {filtered.slice(0, visibleCount).map((entry, i) => {
            const rank = i + 1
            const cat = CATEGORY_MAP[entry.category]
            const catColor = CAT_COLOR[entry.category]
            const rankStyle = RANK_STYLE[rank]
            const tr = translations.get(entry.id)

            return (
              <div
                key={entry.id}
                onClick={() => onSelectBattle?.(entry)}
                style={{ marginBottom: 24, cursor: 'pointer' }}
              >
                {/* 폴라로이드 카드 */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: 4,
                  boxShadow: '0 2px 14px rgba(0,0,0,0.13)',
                  overflow: 'hidden',
                }}>
                  {/* 이미지 영역 */}
                  <div style={{ padding: '6px 6px 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, position: 'relative' }}>
                      {/* 이미지 A */}
                      <div style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden', background: '#111' }}>
                        {entry.isTextOnly ? (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: TEXT_BG_COLORS[getTextColorIdx(entry.id, 0)].bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10,
                          }}>
                            <p style={{
                              color: TEXT_BG_COLORS[getTextColorIdx(entry.id, 0)].text,
                              fontWeight: 700, fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.4,
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', margin: 0,
                            }}>
                              {tr?.imageAText ?? entry.imageAText}
                            </p>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={entry.imageAUrl}
                            alt="A"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                        {/* A 라벨 */}
                        <div style={{
                          position: 'absolute', top: 7, left: 7,
                          background: '#3D2B1F', color: 'white',
                          fontSize: '0.6rem', fontWeight: 900, padding: '2px 7px', borderRadius: 4,
                        }}>A</div>
                      </div>

                      {/* 이미지 B */}
                      <div style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden', background: '#111' }}>
                        {entry.isTextOnly ? (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: TEXT_BG_COLORS[getTextColorIdx(entry.id, 1)].bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10,
                          }}>
                            <p style={{
                              color: TEXT_BG_COLORS[getTextColorIdx(entry.id, 1)].text,
                              fontWeight: 700, fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.4,
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', margin: 0,
                            }}>
                              {tr?.imageBText ?? entry.imageBText}
                            </p>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={entry.imageBUrl}
                            alt="B"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                        {/* B 라벨 */}
                        <div style={{
                          position: 'absolute', top: 7, left: 7,
                          background: '#D4C4B0', color: '#3D2B1F',
                          fontSize: '0.6rem', fontWeight: 900, padding: '2px 7px', borderRadius: 4,
                        }}>B</div>
                      </div>

                      {/* 순위 배지 — 두 이미지 사이 중앙 상단 */}
                      <div style={{
                        position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
                        background: rankStyle ? rankStyle.bg : 'rgba(0,0,0,0.72)',
                        color: rankStyle ? rankStyle.color : 'white',
                        fontSize: rank > 9 ? '0.6rem' : '0.68rem',
                        fontWeight: 900,
                        minWidth: 22, height: 22,
                        borderRadius: 5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        zIndex: 10,
                      }}>
                        {rank}
                      </div>
                    </div>
                  </div>

                  {/* 폴라로이드 하단 정보 */}
                  <div style={{ padding: '10px 10px 14px' }}>
                    {/* 카테고리 배지 */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: catColor.bg, color: catColor.text,
                      borderRadius: 4, padding: '2px 7px',
                      fontSize: '0.65rem', fontWeight: 700,
                    }}>
                      {cat.emoji} {t(`categories.${entry.category}` as Parameters<typeof t>[0])}
                    </span>

                    {/* 제목 + 작성자 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 8px' }}>
                      <p style={{
                        flex: 1, margin: 0, fontSize: '0.98rem', fontWeight: 700, lineHeight: 1.4,
                        color: '#3D2B1F',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {tr?.title ?? entry.title}
                      </p>
                      {entry.author && (
                        <button
                          onClick={e => { e.stopPropagation(); setProfileModalUserId(entry.author!.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {entry.author.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={entry.author.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <span style={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem', fontWeight: 900, color: 'white',
                            }}>
                              {entry.author.displayName[0]?.toUpperCase() ?? '?'}
                            </span>
                          )}
                          {entry.author.country && (
                            <span style={{ fontSize: '1.08rem', lineHeight: 1 }}>{countryToFlag(entry.author.country)}</span>
                          )}
                          <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#3D2B1F', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.author.displayName}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* 좋아요 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Heart size={12} style={{ fill: '#F43F5E', stroke: '#F43F5E', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#F43F5E' }}>
                        {entry.likeCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {/* 스크롤 sentinel + 로딩 인디케이터 */}
          {visibleCount < filtered.length ? (
            <div ref={sentinelRef} style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#F59E0B',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <p style={{ fontSize: '0.86rem', color: 'var(--color-muted-foreground)' }}>
                {t('hot.viewConfirmed', { category: categoryLabel(category), count: filtered.length })}
              </p>
            </div>
          )}
        </div>
      )}

      {profileModalUserId && (
        <UserProfileModal userId={profileModalUserId} onClose={() => setProfileModalUserId(null)} />
      )}
    </div>
  )
}
