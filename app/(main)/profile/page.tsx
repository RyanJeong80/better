import { redirect } from 'next/navigation'
import { eq, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes, likes, users, userStats } from '@/lib/db/schema'
import { signOut } from '@/actions/auth'
import { calcLevel, CATEGORY_LABELS } from '@/lib/level'
import { LevelBadge } from '@/components/ui/level-badge'
import { LevelUpToast } from '@/components/profile/level-up-toast'
import { UsernameEditor } from '@/components/profile/username-editor'
import { ProfileBetterList, type BattleWithStats } from '@/components/profile/profile-better-list'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // DB에서 username + user_stats 조회
  const [dbUser, stats] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { username: true, name: true, avatarUrl: true },
    }).catch(() => null),
    db.query.userStats.findFirst({
      where: eq(userStats.userId, user.id),
    }).catch(() => null),
  ])

  const username = dbUser?.username ?? user.user_metadata?.username ?? ''

  const levelInfo = calcLevel(
    stats?.totalVotes ?? 0,
    stats?.accuracyRate != null ? parseFloat(stats.accuracyRate as string) : null,
  )

  // 가장 높은 적중률 카테고리 찾기
  const catAccuracies = stats ? [
    { key: 'fashion',    value: stats.fashionAccuracy },
    { key: 'appearance', value: stats.appearanceAccuracy },
    { key: 'love',       value: stats.loveAccuracy },
    { key: 'shopping',   value: stats.shoppingAccuracy },
    { key: 'food',       value: stats.foodAccuracy },
    { key: 'it',         value: stats.itAccuracy },
    { key: 'decision',   value: stats.decisionAccuracy },
  ].filter(c => c.value != null) as { key: string; value: string }[] : []

  const bestCat = catAccuracies.length
    ? catAccuracies.reduce((best, c) =>
        parseFloat(c.value) > parseFloat(best.value) ? c : best
      )
    : null

  let battlesWithStats: BattleWithStats[] = []

  try {
    const myBetters = await db.select({
      id: betters.id,
      title: betters.title,
      imageAUrl: betters.imageAUrl,
      imageADescription: betters.imageADescription,
      imageBUrl: betters.imageBUrl,
      imageBDescription: betters.imageBDescription,
      category: betters.category,
      createdAt: betters.createdAt,
    })
      .from(betters)
      .where(eq(betters.userId, user.id))
      .orderBy(betters.createdAt)

    const myBetterIds = myBetters.map((b) => b.id)

    const [myVotes, myLikes] = myBetterIds.length
      ? await Promise.all([
          db.select({ betterId: votes.betterId, choice: votes.choice, reason: votes.reason })
            .from(votes)
            .where(inArray(votes.betterId, myBetterIds)),
          db.select({ betterId: likes.betterId })
            .from(likes)
            .where(inArray(likes.betterId, myBetterIds)),
        ])
      : [[], []]

    const votesByBetter = new Map<string, { choice: 'A' | 'B'; reason: string | null }[]>()
    for (const v of myVotes) {
      if (!votesByBetter.has(v.betterId)) votesByBetter.set(v.betterId, [])
      votesByBetter.get(v.betterId)!.push({ choice: v.choice, reason: v.reason })
    }

    const likeCountMap = new Map<string, number>()
    for (const l of myLikes) {
      likeCountMap.set(l.betterId, (likeCountMap.get(l.betterId) ?? 0) + 1)
    }

    battlesWithStats = myBetters
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((b) => {
        const bvotes = votesByBetter.get(b.id) ?? []
        return {
          ...b,
          votesA: bvotes.filter((v) => v.choice === 'A').length,
          votesB: bvotes.filter((v) => v.choice === 'B').length,
          total: bvotes.length,
          reasons: bvotes
            .filter((v): v is typeof v & { reason: string } => !!v.reason)
            .map((v) => ({ choice: v.choice, reason: v.reason })),
          likesCount: likeCountMap.get(b.id) ?? 0,
          category: b.category,
        }
      })
  } catch (e) {
    const pg = e as Record<string, unknown>
    console.error('[ProfilePage] DB error:', { message: pg.message, code: pg.code, detail: pg.detail, hint: pg.hint })
  }

  const totalVotes = battlesWithStats.reduce((s, b) => s + b.total, 0)
  const totalLikes = battlesWithStats.reduce((s, b) => s + b.likesCount, 0)

  return (
    <div className="space-y-6">
      <LevelUpToast
        currentLevel={levelInfo.level}
        levelName={levelInfo.levelName}
        emoji={levelInfo.emoji}
      />

      {/* 유저 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {username[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <UsernameEditor currentUsername={username} />
            <div className="mt-1 flex items-center gap-2">
              <LevelBadge level={levelInfo} size="xs" />
              {bestCat && (
                <span style={{ fontSize: '0.65rem', color: 'var(--color-muted-foreground)' }}>
                  {CATEGORY_LABELS[bestCat.key].emoji} {CATEGORY_LABELS[bestCat.key].label} 전문
                </span>
              )}
            </div>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            로그아웃
          </button>
        </form>
      </div>

      {/* 레벨 카드 */}
      <div
        className="overflow-hidden rounded-3xl p-5"
        style={{ background: `linear-gradient(135deg, ${levelInfo.bgColor}, white)`, border: `1.5px solid ${levelInfo.color}30` }}
      >
        <div className="flex items-center gap-4">
          <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{levelInfo.emoji}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: levelInfo.color, letterSpacing: '0.06em', marginBottom: 2 }}>
              Lv.{levelInfo.level} · {levelInfo.levelName}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <p style={{ fontSize: '0.65rem', color: '#6B7280' }}>총 투표</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: levelInfo.color, lineHeight: 1.1 }}>
                  {stats?.totalVotes ?? 0}
                  <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>건</span>
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', color: '#6B7280' }}>적중률</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: levelInfo.color, lineHeight: 1.1 }}>
                  {stats?.accuracyRate != null ? `${parseFloat(stats.accuracyRate as string).toFixed(1)}%` : '-'}
                </p>
              </div>
              {bestCat && (
                <div>
                  <p style={{ fontSize: '0.65rem', color: '#6B7280' }}>전문 분야</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 900, color: levelInfo.color, lineHeight: 1.1 }}>
                    {CATEGORY_LABELS[bestCat.key].emoji}
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: 2 }}>
                      {parseFloat(bestCat.value).toFixed(0)}%
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 카테고리별 적중률 */}
        {catAccuracies.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {catAccuracies
              .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
              .map(c => (
                <span
                  key={c.key}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '3px 8px', borderRadius: 999,
                    background: 'white', border: `1px solid ${levelInfo.color}30`,
                    fontSize: '0.68rem', fontWeight: 700, color: '#374151',
                  }}
                >
                  {CATEGORY_LABELS[c.key].emoji}
                  <span style={{ color: '#6B7280' }}>{CATEGORY_LABELS[c.key].label}</span>
                  <span style={{ color: levelInfo.color }}>{parseFloat(c.value).toFixed(0)}%</span>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Better', value: `${battlesWithStats.length}개` },
          { label: '총 투표', value: `${totalVotes}표` },
          { label: '좋아요', value: `${totalLikes}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Better 목록 */}
      <ProfileBetterList battles={battlesWithStats} />
    </div>
  )
}
