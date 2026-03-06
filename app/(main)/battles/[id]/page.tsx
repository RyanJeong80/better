import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { betters, votes } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { BattleVote } from '@/components/battles/battle-vote'

export default async function BattlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')

  if (!isConfigured) notFound()

  try {
    const better = await db.query.betters.findFirst({
      where: eq(betters.id, id),
      with: { user: true },
    })

    if (!better) notFound()

    const allVotes = await db.query.votes.findMany({
      where: eq(votes.betterId, id),
    })

    let userVote = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userVote = user
        ? allVotes.find((v) => v.voterId === user.id)?.choice ?? null
        : null
    } catch {}

    const counts = {
      A: allVotes.filter((v) => v.choice === 'A').length,
      B: allVotes.filter((v) => v.choice === 'B').length,
      total: allVotes.length,
    }

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{better.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">총 {counts.total}표</p>
        </div>

        <BattleVote
          battleId={better.id}
          imageAUrl={better.imageAUrl}
          imageBUrl={better.imageBUrl}
          counts={counts}
          userVote={userVote}
          readOnly
        />
      </div>
    )
  } catch {
    notFound()
  }
}
