export type LevelInfo = {
  level: number
  levelName: string
  emoji: string
  color: string
  bgColor: string
}

export const LEVEL_LIST: LevelInfo[] = [
  { level: 1, levelName: '아이언',     emoji: '🪨', color: '#6B7280', bgColor: '#F3F4F6' },
  { level: 2, levelName: '브론즈',     emoji: '🥉', color: '#92400E', bgColor: '#FEF3C7' },
  { level: 3, levelName: '실버',       emoji: '🥈', color: '#374151', bgColor: '#F3F4F6' },
  { level: 4, levelName: '골드',       emoji: '🥇', color: '#D97706', bgColor: '#FFFBEB' },
  { level: 5, levelName: '플래티넘',   emoji: '💠', color: '#0284C7', bgColor: '#E0F2FE' },
  { level: 6, levelName: '다이아몬드', emoji: '💎', color: '#7C3AED', bgColor: '#EDE9FE' },
]

export function calcLevel(totalVotes: number, accuracy: number | null): LevelInfo {
  if (totalVotes >= 200 && accuracy !== null && accuracy >= 78) return LEVEL_LIST[5]
  if (totalVotes >= 100 && accuracy !== null && accuracy >= 70) return LEVEL_LIST[4]
  if (totalVotes >= 50  && accuracy !== null && accuracy >= 62) return LEVEL_LIST[3]
  if (totalVotes >= 30  && accuracy !== null && accuracy >= 55) return LEVEL_LIST[2]
  if (totalVotes >= 10)                                          return LEVEL_LIST[1]
  return LEVEL_LIST[0]
}

export const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  fashion:    { label: '패션',   emoji: '👗' },
  appearance: { label: '외모',   emoji: '💄' },
  love:       { label: '연애',   emoji: '💕' },
  shopping:   { label: '쇼핑',   emoji: '💰' },
  food:       { label: '맛집',   emoji: '🍽️' },
  it:         { label: 'IT',     emoji: '📱' },
  decision:   { label: '결정',   emoji: '🤔' },
}
