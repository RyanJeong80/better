import { NextResponse } from 'next/server'
import { ilike, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tags } from '@/lib/db/schema'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json([])

  try {
    const rows = await db
      .select({ name: tags.name, count: tags.count })
      .from(tags)
      .where(ilike(tags.name, `%${q}%`))
      .orderBy(desc(tags.count))
      .limit(8)
    return NextResponse.json(rows.map(r => ({ name: r.name, betterCount: r.count ?? 0 })))
  } catch {
    return NextResponse.json([])
  }
}
