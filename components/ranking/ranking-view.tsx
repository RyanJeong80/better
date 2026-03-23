import Link from 'next/link'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'
import { calcLevel } from '@/lib/level'
import { LevelBadge } from '@/components/ui/level-badge'
import type { CategoryFilter } from '@/lib/constants/categories'

export type RankEntry = {
  userId: string
  displayName: string
  participated: number
  hits: number
  accuracy: number
}

export type MyStats = {
  participated: number
  hits: number
  accuracy: number
}

export function RankingView({
  myStats,
  participationRanking,
  accuracyRanking,
  currentUserId,
  currentCategory = 'all',
  isDemo = false,
}: {
  myStats: MyStats | null
  participationRanking: RankEntry[]
  accuracyRanking: RankEntry[]
  currentUserId?: string
  currentCategory?: CategoryFilter
  isDemo?: boolean
}) {
  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>미리보기 모드</strong> — Supabase를 연결하면 실제 데이터가 표시됩니다.
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black">Better 랭킹</h2>
        <p className="mt-1 text-sm text-muted-foreground">참여 횟수와 적중률로 순위를 확인하세요</p>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {CATEGORY_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'all' ? '/ranking' : `/ranking?category=${f.id}`}
            className={[
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              currentCategory === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >
            {f.emoji} {f.label}
          </Link>
        ))}
      </div>

      {/* 나의 기록 */}
      {myStats !== null && (
        <div
          className="overflow-hidden rounded-3xl p-5"
          style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)', border: '1px solid #C7D2FE' }}
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-500">나의 기록</p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="참여한 Better"
              value={`${myStats.participated}건`}
              color="#6366F1"
            />
            <StatCard
              label="적중률"
              value={myStats.accuracy === -1 ? '-' : `${myStats.accuracy}%`}
              color="#8B5CF6"
              highlight
            />
          </div>
        </div>
      )}

      {/* 두 랭킹 테이블 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RankTable
          title="참가 순위"
          subtitle="많이 참여할수록 ↑"
          entries={participationRanking}
          primaryKey="participated"
          currentUserId={currentUserId}
          accentColor="#6366F1"
        />
        <RankTable
          title="적중률 순위"
          subtitle="다수의 선택을 맞출수록 ↑"
          entries={accuracyRanking}
          primaryKey="accuracy"
          currentUserId={currentUserId}
          accentColor="#8B5CF6"
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string
  value: string
  color: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 text-center backdrop-blur-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-black" style={{ color: highlight ? color : undefined }}>
        {value}
      </p>
    </div>
  )
}

function RankTable({
  title,
  subtitle,
  entries,
  primaryKey,
  currentUserId,
  accentColor,
}: {
  title: string
  subtitle: string
  entries: RankEntry[]
  primaryKey: 'participated' | 'accuracy'
  currentUserId?: string
  accentColor: string
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-bold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">아직 데이터가 없어요</div>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((entry, i) => {
            const rank = i + 1
            const isMe = entry.userId === currentUserId
            const primaryValue =
              primaryKey === 'accuracy'
                ? entry.accuracy === -1 ? '-' : `${entry.accuracy}%`
                : `${entry.participated}건`
            const secondaryValue =
              primaryKey === 'accuracy'
                ? `${entry.participated}건`
                : entry.accuracy === -1 ? '-' : `${entry.accuracy}%`

            return (
              <li
                key={entry.userId}
                className="flex items-center gap-3 px-5 py-3"
                style={{ background: isMe ? `${accentColor}08` : undefined }}
              >
                {/* 순위 */}
                <RankBadge rank={rank} color={accentColor} />

                {/* 이름 */}
                <span className="flex-1 truncate text-sm font-semibold">
                  {entry.displayName}
                  {isMe && (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: `${accentColor}18`, color: accentColor }}
                    >
                      나
                    </span>
                  )}
                </span>
                <LevelBadge
                  level={calcLevel(entry.participated, entry.accuracy === -1 ? null : entry.accuracy)}
                  size="xs"
                  showName={false}
                />

                {/* 주 지표 */}
                <span className="text-sm font-black tabular-nums" style={{ color: accentColor }}>
                  {primaryValue}
                </span>

                {/* 부 지표 */}
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {secondaryValue}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RankBadge({ rank, color }: { rank: number; color: string }) {
  if (rank <= 3) {
    const bg = rank === 1 ? '#FEF3C7' : rank === 2 ? '#F3F4F6' : '#FEF3C7'
    const text = rank === 1 ? '#D97706' : rank === 2 ? '#6B7280' : '#92400E'
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
        style={{ background: bg, color: text }}
      >
        {rank}
      </span>
    )
  }
  return (
    <span className="w-7 shrink-0 text-center text-sm font-bold text-muted-foreground">
      {rank}
    </span>
  )
}
