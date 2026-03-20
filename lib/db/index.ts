import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DB = PostgresJsDatabase<typeof schema>

let _db: DB | null = null

function getDb(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('[DB] DATABASE_URL is not set')

    const parsed = new URL(url)
    console.log('[DB] connecting to:', parsed.hostname + ':' + parsed.port, '| user:', parsed.username)

    const client = postgres(url, {
      ssl: { rejectUnauthorized: false },
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      // 쿼리 무한 hang 방지 — 8초 초과 시 DB 레벨에서 강제 종료
      connection: { statement_timeout: 8000 },
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
