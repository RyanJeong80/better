import { NextRequest, NextResponse } from 'next/server'
import { like, eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, betters, votes, tags, betterTags, userStats } from '@/lib/db/schema'

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.replace('Bearer ', '') === process.env.ADMIN_PASSWORD
}

const VALID_CATEGORIES = ['fashion', 'appearance', 'love', 'shopping', 'food', 'it', 'decision'] as const
type BetterCategory = typeof VALID_CATEGORIES[number]

type BulkRow = {
  username: string
  country?: string
  category?: string
  title: string
  description?: string
  imageADescription?: string
  imageBDescription?: string
  imageAUrl?: string
  imageBUrl?: string
  tags?: string[]
  durationDays?: number | string
  voteCount?: number | string
  voteRatioA?: number | string
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { row } = (await req.json()) as { row: BulkRow }
  if (!row?.title || !row?.username) {
    return NextResponse.json({ error: 'title and username required' }, { status: 400 })
  }

  try {
    // 1. Find or create virtual user by name
    const [matchingVU] = await db.select({ id: users.id })
      .from(users)
      .where(and(like(users.email, 'virtual_%@touched.local'), eq(users.name, row.username)))
      .limit(1)

    let userId: string

    if (matchingVU) {
      userId = matchingVU.id
    } else {
      const id = crypto.randomUUID()
      const shortId = id.replace(/-/g, '').slice(0, 8)
      const email = `virtual_${shortId}@touched.local`
      const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(row.username)}`
      await db.insert(users).values({ id, email, name: row.username, country: row.country ?? 'KR', avatarUrl })
      await db.insert(userStats).values({ userId: id }).onConflictDoNothing()
      userId = id
    }

    // 2. Image URLs — fallback to picsum
    const imageAUrl = row.imageAUrl?.trim() || `https://picsum.photos/seed/${encodeURIComponent(row.title + 'A')}/400/400`
    const imageBUrl = row.imageBUrl?.trim() || `https://picsum.photos/seed/${encodeURIComponent(row.title + 'B')}/400/400`

    // 3. Category validation
    const category: BetterCategory = VALID_CATEGORIES.includes(row.category as BetterCategory)
      ? (row.category as BetterCategory)
      : 'decision'

    // 4. closedAt
    const closedAt = new Date()
    closedAt.setDate(closedAt.getDate() + (parseInt(String(row.durationDays)) || 7))

    // 5. Create battle
    const [battle] = await db.insert(betters).values({
      userId,
      title: row.title,
      description: row.description || null,
      category,
      imageAUrl,
      imageADescription: row.imageADescription || null,
      imageBUrl,
      imageBDescription: row.imageBDescription || null,
      closedAt,
    }).returning({ id: betters.id })

    // 6. Tags
    if (row.tags && row.tags.length > 0 && battle) {
      for (const tagName of row.tags) {
        const trimmed = tagName?.trim()
        if (!trimmed) continue

        const [existing] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, trimmed)).limit(1)

        let tagId: string
        if (existing) {
          tagId = existing.id
        } else {
          const [newTag] = await db.insert(tags).values({ name: trimmed }).returning({ id: tags.id })
          tagId = newTag.id
        }

        await db.insert(betterTags).values({ betterId: battle.id, tagId }).onConflictDoNothing()
      }
    }

    // 7. Dummy votes
    const voteCount = parseInt(String(row.voteCount)) || 0
    if (voteCount > 0 && battle) {
      const virtualUsers = await db.select({ id: users.id })
        .from(users)
        .where(like(users.email, 'virtual_%@touched.local'))

      if (virtualUsers.length > 0) {
        const ratioA = parseInt(String(row.voteRatioA)) || 50
        const actualCount = Math.min(voteCount, virtualUsers.length)
        const aCount = Math.round(actualCount * ratioA / 100)
        const shuffled = [...virtualUsers].sort(() => Math.random() - 0.5).slice(0, actualCount)

        const newVotes = shuffled.map((u, i) => ({
          betterId: battle.id,
          voterId: u.id,
          choice: i < aCount ? ('A' as const) : ('B' as const),
        }))

        if (newVotes.length > 0) {
          await db.insert(votes).values(newVotes).onConflictDoNothing()
        }
      }
    }

    return NextResponse.json({ ok: true, battleId: battle.id })
  } catch (e) {
    console.error('Bulk upload error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
