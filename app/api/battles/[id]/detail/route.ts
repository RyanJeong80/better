import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes, comments } from '@/lib/db/schema'

export type BetterDetailComment = {
  id: string
  userId: string
  userName: string | null
  userAvatar: string | null
  content: string
  createdAt: string
}

export type BetterDetailData = {
  voteCounts: { A: number; B: number; total: number }
  userVote: 'A' | 'B' | null
  comments: BetterDetailComment[]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const [allVotes, allComments] = await Promise.all([
      db.query.votes.findMany({ where: eq(votes.betterId, id) }),
      db.query.comments.findMany({
        where: eq(comments.betterId, id),
        with: { user: { columns: { name: true, avatarUrl: true } } },
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      }),
    ])

    let userVote: 'A' | 'B' | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userVote = (allVotes.find(v => v.voterId === user.id)?.choice ?? null) as 'A' | 'B' | null
      }
    } catch {}

    const votesA = allVotes.filter(v => v.choice === 'A').length
    const votesB = allVotes.filter(v => v.choice === 'B').length

    const data: BetterDetailData = {
      voteCounts: { A: votesA, B: votesB, total: allVotes.length },
      userVote,
      comments: allComments.map(c => ({
        id: c.id,
        userId: c.userId,
        userName: c.user?.name ?? null,
        userAvatar: c.user?.avatarUrl ?? null,
        content: c.content,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      })),
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
