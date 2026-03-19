import { redirect } from 'next/navigation'
import { eq, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, votes, likes, users } from '@/lib/db/schema'
import { signOut } from '@/actions/auth'
import { UsernameEditor } from '@/components/profile/username-editor'
import { ProfileBetterList, type BattleWithStats } from '@/components/profile/profile-better-list'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // DB에서 username 조회
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { username: true, name: true, avatarUrl: true },
  }).catch(() => null)

  const username = dbUser?.username ?? user.user_metadata?.username ?? ''

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
            <p className="text-xs text-muted-foreground">나의 Better 모음</p>
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
