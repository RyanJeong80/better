import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DB = PostgresJsDatabase<typeof schema>

// 모듈 로드 시 바로 연결하지 않고 첫 쿼리 시점에 연결
// → DATABASE_URL이 플레이스홀더여도 import 자체는 안전
let _db: DB | null = null

function getDb(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('[DB] DATABASE_URL is not set')
    const client = postgres(url, {
      ssl: 'require',
      max: 1, // 서버리스 환경에서 연결 수 제한
      idle_timeout: 20,
      connect_timeout: 10,
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
