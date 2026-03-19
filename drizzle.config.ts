import { defineConfig } from 'drizzle-kit'
import * as fs from 'fs'

// .env.local을 수동으로 파싱 (dotenv 없이)
if (fs.existsSync('.env.local')) {
  const envFile = fs.readFileSync('.env.local', 'utf-8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // 마이그레이션은 직접 연결(5432) 필요 — Transaction Pooler(6543)는 drizzle-kit 미지원
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
})
