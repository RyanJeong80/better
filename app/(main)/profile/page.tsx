import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { betters, users } from '@/lib/db/schema'
import { signOut } from '@/actions/auth'
import { MyBetterCard } from '@/components/battles/my-better-card'
import { UsernameEditor } from '@/components/profile/username-editor'

type BattleWithStats = {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  votesA: number
  votesB: number
  total: number
  reasons: { choice: 'A' | 'B'; reason: string }[]
  createdAt: Date
  likesCount: number
}

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
    const myBetters = await db.query.betters.findMany({
      where: eq(betters.userId, user.id),
      orderBy: (betters, { desc }) => [desc(betters.createdAt)],
      with: { votes: { columns: { choice: true, reason: true } }, likes: { columns: { id: true } } },
    })

    battlesWithStats = myBetters.map((b) => ({
      ...b,
      votesA: b.votes.filter((v) => v.choice === 'A').length,
      votesB: b.votes.filter((v) => v.choice === 'B').length,
      total: b.votes.length,
      reasons: b.votes
        .filter((v): v is typeof v & { reason: string } => !!v.reason)
        .map((v) => ({ choice: v.choice, reason: v.reason })),
      likesCount: b.likes.length,
    }))
  } catch {}

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
      {battlesWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
          <div className="mb-3 text-4xl">📸</div>
          <p className="font-bold">아직 Better가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">두 사진을 올리고 사람들의 선택을 받아보세요</p>
          <Link
            href="/battles/new"
            className="mt-6 rounded-2xl px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            첫 Better 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {battlesWithStats.map((battle) => (
            <MyBetterCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}
    </div>
  )
}
