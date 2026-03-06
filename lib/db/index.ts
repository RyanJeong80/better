import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DB = PostgresJsDatabase<typeof schema>

// 모듈 로드 시 바로 연결하지 않고 첫 쿼리 시점에 연결
// → DATABASE_URL이 플레이스홀더여도 import 자체는 안전
let _db: DB | null = null

function getDb(): DB {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL!)
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as DB, {
  get(_, prop: string | symbol) {
    return getDb()[prop as keyof DB]
  },
})
