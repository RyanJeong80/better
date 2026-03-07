import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DB = PostgresJsDatabase<typeof schema>

let _db: DB | null = null

function getDb(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('[DB] DATABASE_URL is not set')

    // URL 유효성 확인 — 특수문자가 URL 인코딩 안 됐으면 파싱 실패
    try {
      new URL(url)
    } catch {
      throw new Error(
        `[DB] DATABASE_URL is not a valid URL. ` +
        `Starts with: "${url.slice(0, 40)}" — ` +
        `Make sure special chars in password are URL-encoded (! → %21, @ → %40, # → %23, $ → %24)`
      )
    }

    console.log('[DB] connecting to:', new URL(url).hostname)

    const client = postgres(url, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // PgBouncer(Supabase pooler) 호환 — prepared statement 비활성화
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as DB, {
  get(_, prop: string | symbol) {
    return getDb()[prop as keyof DB]
  },
})
