'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useTranslations } from 'next-intl'
import { ArrowDownToLine, Share2 } from 'lucide-react'
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
  /**
   * 'icon'  → 32×32 아이콘 버튼 (my-better-card 헤더용)
   * 'row'   → 텍스트+아이콘 가로 버튼 (기본, battle-vote용)
   */
  variant?: 'row' | 'icon'
}

export function ShareButton({
  battleId, title, imageAUrl, imageBUrl,
  pctA, pctB, total, winner,
  isTextOnly, imageAText, imageBText,
  variant = 'row',
}: ShareButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  // 실제 이미지 소스 (캡처 시 blob URL로 교체됨)
  const [effectiveUrls, setEffectiveUrls] = useState({ a: imageAUrl, b: imageBUrl })
  // 캡처 카드를 DOM에 마운트할지 여부 (lazy: 캡처 직전에만 true)
  const [showCard, setShowCard] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('share')

  useEffect(() => { setMounted(true) }, [])

  async function capture() {
    // 1. 카드를 DOM에 마운트 (동기 렌더)
    flushSync(() => setShowCard(true))

    if (!cardRef.current) throw new Error('[ShareButton] cardRef not set after mount')

    let blobA: string | null = null
    let blobB: string | null = null

    // 2. 이미지를 blob URL로 변환 → CORS 캐시 문제 회피
    if (!isTextOnly) {
      try {
        const toBlob = (url: string) =>
          fetch(url, { mode: 'cors', cache: 'no-store' })
            .then(r => r.blob())
            .then(b => URL.createObjectURL(b))

        const [a, b] = await Promise.all([toBlob(imageAUrl), toBlob(imageBUrl)])
        blobA = a
        blobB = b

        // 카드 이미지 src를 blob URL로 교체 (동기 렌더)
        flushSync(() => setEffectiveUrls({ a, b }))

        // 3. img 요소들이 새 blob URL을 완전히 로드할 때까지 대기
        if (cardRef.current) {
          const imgs = cardRef.current.querySelectorAll<HTMLImageElement>('img')
          await Promise.all(
            Array.from(imgs).map(img =>
              img.complete
                ? Promise.resolve()
                : new Promise<void>(resolve => {
                    img.addEventListener('load', () => resolve(), { once: true })
                    img.addEventListener('error', () => resolve(), { once: true })
                  })
            )
          )
        }
      } catch {
        // fetch 실패 시 원본 URL로 폴백 (useCORS로 시도)
      }
    }

    if (!cardRef.current) throw new Error('[ShareButton] cardRef lost before capture')

    // 4. html2canvas로 캡처
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(cardRef.current, {
      useCORS: true,
      allowTaint: false,
      scale: 1,
      width: 1080,
      height: 1080,
      logging: false,
      backgroundColor: '#EDE4DA',
    })

    // 5. 정리: blob URL 해제 + 카드 언마운트
    if (blobA) URL.revokeObjectURL(blobA)
    if (blobB) URL.revokeObjectURL(blobB)
    flushSync(() => {
      setEffectiveUrls({ a: imageAUrl, b: imageBUrl })
      setShowCard(false)
    })

    return canvas
  }

  async function handleSave() {
    if (capturing) return
    setCapturing(true)
    try {
      const canvas = await capture()
      const link = document.createElement('a')
      link.download = 'touched-result.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('[ShareButton] 저장 실패:', e)
    } finally {
      setCapturing(false)
    }
  }

  async function handleShare() {
    if (capturing) return
    setCapturing(true)
    try {
      const canvas = await capture()
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
      )
      const file = new File([blob], 'touched-result.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: t('shareTitle'), files: [file] })
      } else {
        // Web Share API 미지원 → 다운로드로 폴백
        const link = document.createElement('a')
        link.download = 'touched-result.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        console.error('[ShareButton] 공유 실패:', e)
      }
    } finally {
      setCapturing(false)
    }
  }

  // ── 스타일 헬퍼 ──────────────────────────────────
  const iconBtnStyle = (gradient: boolean): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    border: gradient ? 'none' : '1.5px solid var(--color-border)',
    background: gradient
      ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
      : 'transparent',
    color: gradient ? 'white' : 'var(--color-muted-foreground)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: capturing ? 'not-allowed' : 'pointer',
    opacity: capturing ? 0.55 : 1,
    transition: 'opacity 0.15s',
  })

  const rowBtnStyle = (gradient: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
    padding: '9px 18px', borderRadius: 12,
    border: gradient ? 'none' : '1.5px solid var(--color-border)',
    background: gradient
      ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
      : 'var(--color-card)',
    color: gradient ? 'white' : 'var(--color-foreground)',
    fontSize: '0.875rem', fontWeight: 700,
    cursor: capturing ? 'not-allowed' : 'pointer',
    opacity: capturing ? 0.55 : 1,
    transition: 'opacity 0.15s',
  })

  return (
    <>
      {/* ── 캡처용 카드: 캡처 중에만 body에 포탈로 마운트 ── */}
      {mounted && showCard && createPortal(
        <div style={{
          position: 'absolute',
          top: -9999,
          left: -9999,
          width: 1080,
          height: 1080,
          pointerEvents: 'none',
        }}>
          <ShareCard
            cardRef={cardRef}
            battleId={battleId}
            title={title}
            imageAUrl={effectiveUrls.a}
            imageBUrl={effectiveUrls.b}
            pctA={pctA}
            pctB={pctB}
            total={total}
            winner={winner}
            isTextOnly={isTextOnly}
            imageAText={imageAText}
            imageBText={imageBText}
          />
        </div>,
        document.body
      )}

      {/* ── 버튼 ── */}
      {variant === 'icon' ? (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); handleSave() }}
            disabled={capturing}
            title={t('save')}
            style={iconBtnStyle(false)}
          >
            <ArrowDownToLine size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleShare() }}
            disabled={capturing}
            title={t('share')}
            style={iconBtnStyle(true)}
          >
            <Share2 size={14} />
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={capturing} style={rowBtnStyle(false)}>
            <ArrowDownToLine size={15} />
            {t('save')}
          </button>
          <button onClick={handleShare} disabled={capturing} style={rowBtnStyle(true)}>
            <Share2 size={15} />
            {t('share')}
          </button>
        </div>
      )}
    </>
  )
}
