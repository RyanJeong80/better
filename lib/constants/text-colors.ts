export const TEXT_BG_COLORS = [
  { bg: '#18181b', text: '#ffffff' },
  { bg: '#7c3aed', text: '#ffffff' },
  { bg: '#db2777', text: '#ffffff' },
  { bg: '#0891b2', text: '#ffffff' },
  { bg: '#f8fafc', text: '#18181b' },
] as const

/** Derive a stable color index from better ID (UUID). offset 0=A, 1=B */
export function getTextColorIdx(id: string, offset: 0 | 1 = 0): number {
  const hex = id.replace(/-/g, '')
  return parseInt(hex.substring(offset * 2, offset * 2 + 2), 16) % TEXT_BG_COLORS.length
}
