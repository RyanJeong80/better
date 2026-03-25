export type LevelKey = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type LevelInfo = {
  level: number
  levelKey: LevelKey
  levelName: string
  emoji: string
  color: string
  bgColor: string
}

export const LEVEL_LIST: LevelInfo[] = [
  { level: 1, levelKey: 'iron',     levelName: '아이언',     emoji: '🪨', color: '#6B7280', bgColor: '#F3F4F6' },
  { level: 2, levelKey: 'bronze',   levelName: '브론즈',     emoji: '🥉', color: '#92400E', bgColor: '#FEF3C7' },
  { level: 3, levelKey: 'silver',   levelName: '실버',       emoji: '🥈', color: '#374151', bgColor: '#F3F4F6' },
  { level: 4, levelKey: 'gold',     levelName: '골드',       emoji: '🥇', color: '#D97706', bgColor: '#FFFBEB' },
  { level: 5, levelKey: 'platinum', levelName: '플래티넘',   emoji: '💠', color: '#0284C7', bgColor: '#E0F2FE' },
  { level: 6, levelKey: 'diamond',  levelName: '다이아몬드', emoji: '💎', color: '#7C3AED', bgColor: '#EDE9FE' },
]

export function calcLevel(totalVotes: number, accuracy: number | null): LevelInfo {
  if (totalVotes >= 200 && accuracy !== null && accuracy >= 78) return LEVEL_LIST[5]
  if (totalVotes >= 100 && accuracy !== null && accuracy >= 70) return LEVEL_LIST[4]
  if (totalVotes >= 50  && accuracy !== null && accuracy >= 62) return LEVEL_LIST[3]
  if (totalVotes >= 30  && accuracy !== null && accuracy >= 55) return LEVEL_LIST[2]
  if (totalVotes >= 10)                                          return LEVEL_LIST[1]
  return LEVEL_LIST[0]
}

export const CATEGORY_LABELS: Record<string, { emoji: string }> = {
  fashion:    { emoji: '👗' },
  appearance: { emoji: '💄' },
  love:       { emoji: '💕' },
  shopping:   { emoji: '💰' },
  food:       { emoji: '🍽️' },
  it:         { emoji: '📱' },
  decision:   { emoji: '🤔' },
}
