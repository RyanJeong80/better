import { getRandomBattle, type BattleForVoting } from '@/actions/battles'
import { db } from '@/lib/db'
import { betters, likes, votes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { SwipeSections } from '@/components/layout/swipe-sections'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'
import Link from 'next/link'
import { Heart, Flame, Trophy } from 'lucide-react'
import { CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type HotEntry = {
  id: string
  title: string
  imageAUrl: string
  imageBUrl: string
  likeCount: number
  category: BetterCategory
}

type RankEntry = {
  id: string
  name: string
  participated: number
  accuracy: number
}

// ─── 데이터 패칭 ─────────────────────────────────────────────────────────────

async function getHotEntries(): Promise<HotEntry[]> {
  try {
    const [allBetters, allLikes] = await Promise.all([
      db.select({
        id: betters.id,
        title: betters.title,
        imageAUrl: betters.imageAUrl,
        imageBUrl: betters.imageBUrl,
        category: betters.category,
      }).from(betters),
      db.select({ betterId: likes.betterId }).from(likes),
    ])
    const likeCountMap = new Map<string, number>()
    for (const l of allLikes) {
      likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
    }
    return allBetters
      .map(b => ({ ...b, likeCount: likeCountMap.get(b.id) ?? 0 }))
      .filter(b => b.likeCount > 0)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 50)
  } catch { return [] }
}

async function getRankingEntries(): Promise<RankEntry[]> {
  try {
    const allVotes = await db.select({
      betterId: votes.betterId,
      voterId: votes.voterId,
      choice: votes.choice,
      voterName: users.name,
      voterEmail: users.email,
      voterUsername: users.username,
    })
      .from(votes)
      .leftJoin(users, eq(votes.voterId, users.id))

    const votesByBetter = new Map<string, typeof allVotes>()
    for (const v of allVotes) {
      if (!votesByBetter.has(v.betterId)) votesByBetter.set(v.betterId, [])
      votesByBetter.get(v.betterId)!.push(v)
    }

    const winners = new Map<string, 'A' | 'B' | null>()
    for (const [id, bvotes] of votesByBetter) {
      const cA = bvotes.filter(v => v.choice === 'A').length
      const cB = bvotes.filter(v => v.choice === 'B').length
      winners.set(id, cA > cB ? 'A' : cB > cA ? 'B' : null)
    }

    const statsMap = new Map<string, { name: string; participated: number; hits: number; eligibleBase: number }>()
    for (const v of allVotes) {
      if (!statsMap.has(v.voterId)) {
        const name = v.voterUsername ?? v.voterName ?? v.voterEmail?.split('@')[0] ?? `#${v.voterId.slice(0, 6)}`
        statsMap.set(v.voterId, { name, participated: 0, hits: 0, eligibleBase: 0 })
      }
      const s = statsMap.get(v.voterId)!
      s.participated++
      const w = winners.get(v.betterId)
      if (w !== null && w !== undefined) {
        s.eligibleBase++
        if (v.choice === w) s.hits++
      }
    }

    return [...statsMap.entries()]
      .map(([id, s]) => ({
        id,
        name: s.name,
        participated: s.participated,
        accuracy: s.eligibleBase > 0 ? Math.round((s.hits / s.eligibleBase) * 100) : -1,
      }))
      .sort((a, b) => b.participated - a.participated)
      .slice(0, 30)
  } catch { return [] }
}

// ─── 랭킹 패널 ───────────────────────────────────────────────────────────────

const RANK_COLOR = ['#D97706', '#9CA3AF', '#92400E']

function RankingPanel({ entries }: { entries: RankEntry[] }) {
  return (
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.2 }}>Better 랭킹</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', marginTop: 2 }}>
            참여 횟수 · 적중률 TOP 30
          </p>
        </div>
      </div>

      {/* 리스트 */}
      {entries.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 20, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>아직 데이터가 없어요</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            투표에 참여하면 여기에 나타납니다
          </p>
        </div>
      ) : (
        <div style={{
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid var(--color-border)',
          background: 'var(--color-card)',
        }}>
          {entries.map((entry, i) => {
            const rank = i + 1
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px',
                  borderBottom: i < entries.length - 1 ? '1px solid var(--color-border)' : undefined,
                }}
              >
                {/* 순위 */}
                {rank <= 3 ? (
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 900,
                    background: rank === 1 ? '#FEF3C7' : rank === 2 ? '#F3F4F6' : '#FEF3C7',
                    color: RANK_COLOR[rank - 1],
                  }}>
                    {rank}
                  </span>
                ) : (
                  <span style={{ width: 28, textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                    {rank}
                  </span>
                )}

                {/* 이름 */}
                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: '0.88rem', fontWeight: 600,
                }}>
                  {entry.name}
                </span>

                {/* 참여 */}
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6366F1', tabularNums: true } as React.CSSProperties}>
                  {entry.participated}건
                </span>

                {/* 적중률 */}
                <span style={{
                  fontSize: '0.72rem', color: 'var(--color-muted-foreground)', minWidth: 36, textAlign: 'right',
                }}>
                  {entry.accuracy === -1 ? '-' : `${entry.accuracy}%`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 전체 보기 */}
      <Link
        href="/ranking"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 16, padding: '12px 0',
          borderRadius: 16, border: '1.5px solid var(--color-border)',
          fontSize: '0.85rem', fontWeight: 700, color: '#6366F1',
          textDecoration: 'none',
        }}
      >
        전체 랭킹 보기 →
      </Link>
    </div>
  )
}

// ─── Hot100 패널 ──────────────────────────────────────────────────────────────

const CAT_BADGE: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#EFF6FF', text: '#2563EB' },
  appearance: { bg: '#FDF2F8', text: '#BE185D' },
  love:       { bg: '#FFF1F2', text: '#F43F5E' },
  shopping:   { bg: '#FFFBEB', text: '#D97706' },
  food:       { bg: '#FFF7ED', text: '#EA580C' },
  it:         { bg: '#F5F3FF', text: '#7C3AED' },
  decision:   { bg: '#F0FDF4', text: '#15803D' },
}

const HOT_RANK_COLOR = ['#D97706', '#9CA3AF', '#92400E']

function HotPanel({ entries }: { entries: HotEntry[] }) {
  return (
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.2 }}>Hot 100 Better</h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', marginTop: 2 }}>
            좋아요를 가장 많이 받은 Better
          </p>
        </div>
      </div>

      {/* 리스트 */}
      {entries.length === 0 ? (
        <div style={{
          padding: '48px 16px', textAlign: 'center',
          borderRadius: 20, border: '1.5px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔥</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>아직 좋아요가 없어요</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
            랜덤 Better에서 마음에 드는 Better에 좋아요를 눌러보세요
          </p>
        </div>
      ) : (
        <div style={{
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid var(--color-border)',
          background: 'var(--color-card)',
        }}>
          {entries.map((entry, i) => {
            const rank = i + 1
            const cat = CATEGORY_MAP[entry.category]
            const catStyle = CAT_BADGE[entry.category]

            return (
              <Link
                key={entry.id}
                href={`/battles/${entry.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < entries.length - 1 ? '1px solid var(--color-border)' : undefined,
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                {/* 순위 */}
                {rank <= 3 ? (
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 900,
                    background: rank === 1 ? '#FEF3C7' : rank === 2 ? '#F3F4F6' : '#FEF3C7',
                    color: HOT_RANK_COLOR[rank - 1],
                  }}>
                    {rank}
                  </span>
                ) : (
                  <span style={{ width: 26, textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted-foreground)', flexShrink: 0 }}>
                    {rank}
                  </span>
                )}

                {/* 미리보기 이미지 */}
                <div style={{ display: 'flex', overflow: 'hidden', borderRadius: 8, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.imageAUrl} alt="A" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.imageBUrl} alt="B" style={{ width: 36, height: 36, objectFit: 'cover', borderLeft: '2px solid var(--color-background)' }} />
                </div>

                {/* 카테고리 배지 (sm 이상) */}
                <span style={{
                  display: 'none',
                  background: catStyle.bg, color: catStyle.text,
                  fontSize: '0.65rem', fontWeight: 700,
                  padding: '2px 7px', borderRadius: 999, flexShrink: 0,
                }}>
                  {cat.emoji} {cat.label}
                </span>

                {/* 제목 */}
                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: '0.83rem', fontWeight: 600,
                }}>
                  {cat.emoji} {entry.title}
                </span>

                {/* 좋아요 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                  background: '#FFF1F2', borderRadius: 999, padding: '3px 8px',
                  border: '1px solid #FECDD3',
                }}>
                  <Heart size={11} style={{ fill: '#F43F5E', stroke: '#F43F5E' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F43F5E' }}>
                    {entry.likeCount}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* 전체 보기 */}
      <Link
        href="/hot"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 16, padding: '12px 0',
          borderRadius: 16, border: '1.5px solid var(--color-border)',
          fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B',
          textDecoration: 'none',
        }}
      >
        전체 Hot 100 보기 →
      </Link>
    </div>
  )
}

// ─── 랜덤 Better 패널 래퍼 ───────────────────────────────────────────────────

function BetterPanel({ initialBattle }: { initialBattle: BattleForVoting | null }) {
  return (
    <div style={{ paddingTop: 8, paddingBottom: 40 }}>
      <RandomBetterViewer initialBattle={initialBattle} />
    </div>
  )
}

// ─── 홈 페이지 ───────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [initialBattle, hotEntries, rankingEntries] = await Promise.all([
    getRandomBattle([], undefined, { skipAuth: true }).catch(() => null),
    getHotEntries(),
    getRankingEntries(),
  ])

  let isLoggedIn = false
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    isLoggedIn = !!data.user
  } catch {}

  return (
    <SwipeSections
      isLoggedIn={isLoggedIn}
      rankingContent={<RankingPanel entries={rankingEntries} />}
      betterContent={<BetterPanel initialBattle={initialBattle} />}
      hotContent={<HotPanel entries={hotEntries} />}
    />
  )
}
