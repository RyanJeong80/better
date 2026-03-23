import type { LevelInfo } from '@/lib/level'

type Size = 'xs' | 'sm' | 'md'

export function LevelBadge({
  level,
  size = 'sm',
  showName = true,
}: {
  level: LevelInfo
  size?: Size
  showName?: boolean
}) {
  const fontSize = size === 'xs' ? '0.62rem' : size === 'sm' ? '0.7rem' : '0.8rem'
  const emojiSize = size === 'xs' ? '0.72rem' : size === 'sm' ? '0.82rem' : '0.95rem'
  const padding = size === 'xs' ? '2px 6px' : size === 'sm' ? '3px 7px' : '4px 10px'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding,
        borderRadius: 999,
        background: level.bgColor,
        color: level.color,
        fontSize,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: emojiSize }}>{level.emoji}</span>
      {showName && level.levelName}
    </span>
  )
}
