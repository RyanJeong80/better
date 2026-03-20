export type BetterCategory = 'fashion' | 'appearance' | 'love' | 'shopping' | 'food' | 'it' | 'decision'
export type CategoryFilter = BetterCategory | 'all'

export const CATEGORIES = [
  {
    id: 'fashion' as const,
    label: '패션/코디',
    emoji: '👗',
    description: '어떤 코디가 나을까? 누가 더 잘 입었을까? 어느 브랜드가 나을까?',
  },
  {
    id: 'appearance' as const,
    label: '외모비교',
    emoji: '💄',
    description: '누가 더 매력있을까? 어떤 헤어스타일이 더 어울릴까?',
  },
  {
    id: 'love' as const,
    label: '연애/심리',
    emoji: '💕',
    description: '고백할까 말까? 이 행동 어떻게 생각해? 이 사람 어때?',
  },
  {
    id: 'shopping' as const,
    label: '쇼핑/투자',
    emoji: '💰',
    description: '이거 살까 말까? 어디에 투자할까? 어느 브랜드가 나을까?',
  },
  {
    id: 'food' as const,
    label: '맛집/카페',
    emoji: '🍽️',
    description: '이 집 vs 저 집, 이 메뉴 vs 저 메뉴, 어느 카페가 더 좋아?',
  },
  {
    id: 'it' as const,
    label: 'IT/전자',
    emoji: '📱',
    description: '아이폰 vs 갤럭시, 맥 vs 윈도우, 어떤 제품이 더 나을까?',
  },
  {
    id: 'decision' as const,
    label: '결정장애',
    emoji: '🤔',
    description: '어떤걸 사는게 나은지, 어디로 가는게 나을지, 무엇이든 결정하기 어렵다면?',
  },
] satisfies { id: BetterCategory; label: string; emoji: string; description: string }[]

// 필터용 — 실제 게시물 카테고리로는 사용 불가
export const CATEGORY_FILTERS = [
  {
    id: 'all' as const,
    label: '전체',
    emoji: '🔥',
  },
  ...CATEGORIES.map(({ id, label, emoji }) => ({ id, label, emoji })),
] satisfies { id: CategoryFilter; label: string; emoji: string }[]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<BetterCategory, typeof CATEGORIES[number]>
