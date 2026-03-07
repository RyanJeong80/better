'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { votes, users } from '@/lib/db/schema'
import type { VoteChoice } from '@/types'

export async function castVote(betterId: string, choice: VoteChoice) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const existing = await db.query.votes.findFirst({
    where: and(
      eq(votes.betterId, betterId),
      eq(votes.voterId, user.id),
    ),
  })

  if (existing) return { error: '이미 투표했습니다' }

  await db.insert(users).values({
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  }).onConflictDoNothing()

  await db.insert(votes).values({
    betterId,
    voterId: user.id,
    choice,
  })

  revalidatePath(`/battles/${betterId}`)
  return { success: true }
}

export async function submitVote(
  betterId: string,
  choice: VoteChoice,
  reason?: string,
): Promise<{ success: true; votesA: number; votesB: number; total: number } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const existing = await db.query.votes.findFirst({
    where: and(eq(votes.betterId, betterId), eq(votes.voterId, user.id)),
  })
  if (existing) return { error: '이미 투표했습니다' }

  await db.insert(users).values({
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  }).onConflictDoNothing()

  await db.insert(votes).values({
    betterId,
    voterId: user.id,
    choice,
    reason: reason?.trim() || null,
  })

  const allVotes = await db.query.votes.findMany({
    where: eq(votes.betterId, betterId),
  })

  const votesA = allVotes.filter((v) => v.choice === 'A').length
  const votesB = allVotes.filter((v) => v.choice === 'B').length
  revalidatePath(`/battles/${betterId}`)
  return { success: true, votesA, votesB, total: allVotes.length }
}

export async function getVoteCounts(betterId: string) {
  const allVotes = await db.query.votes.findMany({
    where: eq(votes.betterId, betterId),
  })

  return {
    A: allVotes.filter((v) => v.choice === 'A').length,
    B: allVotes.filter((v) => v.choice === 'B').length,
    total: allVotes.length,
  }
}
