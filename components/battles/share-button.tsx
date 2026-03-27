'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ShareCard } from './share-card'

interface ShareButtonProps {
  battleId: string
  title: string
  imageAUrl: string
  imageBUrl: string
  pctA: number
  pctB: number
  total: number
  winner: 'A' | 'B' | null
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
  /** compact=true: 아이콘만, false: 아이콘+라벨 */
  compact?: boolean
}

export function ShareButton({
  battleId, title, imageAUrl, imageBUrl,
  pctA, pctB, total, winner,
  isTextOnly, imageAText, imageBText,
  compact = false,
}: ShareButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const t = useTranslations('share')

  async function capture() {
    if (!cardRef.current) return null
    const html2canvas = (await import('html2canvas')).default
    return html2canvas(cardRef.current, {
      useCORS: true,
      allowTaint: false,
      scale: 1,
      width: 1080,
      height: 1080,
      logging: false,
    })
  }

  async function handleSave() {
    setCapturing(true)
    try {
      const canvas = await capture()
      if (!canvas) return
      const link = document.createElement('a')
      link.download = 'touched-result.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setCapturing(false)
    }
  }

  async function handleShare() {
    setCapturing(true)
    try {
      const canvas = await capture()
      if (!canvas) return
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
      )
      const file = new File([blob], 'touched-result.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: t('shareTitle'), files: [file] })
      } else {
        const link = document.createElement('a')
        link.download = 'touched-result.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    } finally {
      setCapturing(false)
    }
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    border: 'none', cursor: capturing ? 'not-allowed' : 'pointer',
    opacity: capturing ? 0.6 : 1,
    fontWeight: 700,
    padding: compact ? '6px 10px' : '9px 18px',
    borderRadius: compact ? 8 : 12,
    fontSize: compact ? '0.75rem' : '0.875rem',
    flexShrink: 0,
  }

  return (
    <>
      {/* 화면에 보이지 않는 캡처용 카드 */}
      <ShareCard
        cardRef={cardRef}
        battleId={battleId}
        title={title}
        imageAUrl={imageAUrl}
        imageBUrl={imageBUrl}
        pctA={pctA}
        pctB={pctB}
        total={total}
        winner={winner}
        isTextOnly={isTextOnly}
        imageAText={imageAText}
        imageBText={imageBText}
      />

      {/* 버튼 행 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* 💾 저장 */}
        <button
          onClick={handleSave}
          disabled={capturing}
          style={{
            ...btnBase,
            background: 'var(--color-card)',
            border: '1.5px solid var(--color-border)',
            color: 'var(--color-foreground)',
          }}
        >
          <span style={{ fontSize: compact ? '0.9rem' : '1rem' }}>💾</span>
          {!compact && t('save')}
        </button>

        {/* 📤 공유 */}
        <button
          onClick={handleShare}
          disabled={capturing}
          style={{
            ...btnBase,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: 'white',
          }}
        >
          <span style={{ fontSize: compact ? '0.9rem' : '1rem' }}>📤</span>
          {t('share')}
        </button>
      </div>
    </>
  )
}
