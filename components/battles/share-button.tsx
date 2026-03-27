'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  /** 'icon' → 32×32 아이콘 버튼 (헤더용) | 'row' → 텍스트+아이콘 (기본) */
  variant?: 'row' | 'icon'
}

export function ShareButton({
  battleId, title, imageAUrl, imageBUrl,
  pctA, pctB, total, winner,
  isTextOnly, imageAText, imageBText,
  variant = 'row',
}: ShareButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('share')

  // 포탈은 클라이언트 마운트 후 항상 DOM에 존재 → cardRef.current 항상 유효
  useEffect(() => { setMounted(true) }, [])

  async function capture() {
    const card = cardRef.current
    if (!card) throw new Error('share card not mounted')

    // img 요소 직접 참조 (isTextOnly가 아닐 때만 존재)
    const imgs = card.querySelectorAll<HTMLImageElement>('img')
    let blobA: string | null = null
    let blobB: string | null = null

    if (!isTextOnly && imgs.length >= 2) {
      try {
        // Supabase CDN 이미지를 blob URL로 변환 → CORS 캐시 문제 완전 회피
        const toBlob = (url: string) =>
          fetch(url, { mode: 'cors', cache: 'no-store' })
            .then(r => { if (!r.ok) throw new Error(r.statusText); return r.blob() })
            .then(b => URL.createObjectURL(b))

        ;[blobA, blobB] = await Promise.all([toBlob(imageAUrl), toBlob(imageBUrl)])

        // React 재렌더 없이 img src 직접 교체
        imgs[0].src = blobA
        imgs[1].src = blobB

        // 이미지가 실제로 로드될 때까지 대기
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
      } catch {
        // blob 변환 실패 시 원본 URL 유지 (useCORS 모드로 시도)
      }
    }

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(card, {
      // blob URL은 same-origin이므로 CORS 설정 불필요
      useCORS: !blobA,       // blob 변환 실패 시에만 useCORS 사용
      allowTaint: false,
      scale: 1,
      width: 1080,
      height: 1080,
      logging: false,
      backgroundColor: '#EDE4DA',
    })

    // blob URL 해제 + img src 원복
    if (blobA && imgs[0]) { URL.revokeObjectURL(blobA); imgs[0].src = imageAUrl }
    if (blobB && imgs[1]) { URL.revokeObjectURL(blobB); imgs[1].src = imageBUrl }

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
      console.error('[Touched] 이미지 저장 실패:', e)
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
        // Web Share API 미지원 → 다운로드 폴백
        const link = document.createElement('a')
        link.download = 'touched-result.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        console.error('[Touched] 이미지 공유 실패:', e)
      }
    } finally {
      setCapturing(false)
    }
  }

  // ── 스타일 ──────────────────────────────────────────
  const iconStyle = (gradient: boolean): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    border: gradient ? 'none' : '1.5px solid var(--color-border)',
    background: gradient ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'transparent',
    color: gradient ? 'white' : 'var(--color-muted-foreground)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: capturing ? 'wait' : 'pointer',
    opacity: capturing ? 0.5 : 1,
    transition: 'opacity 0.15s',
  })

  const rowStyle = (gradient: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
    padding: '9px 18px', borderRadius: 12,
    border: gradient ? 'none' : '1.5px solid var(--color-border)',
    background: gradient ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'var(--color-card)',
    color: gradient ? 'white' : 'var(--color-foreground)',
    fontSize: '0.875rem', fontWeight: 700,
    cursor: capturing ? 'wait' : 'pointer',
    opacity: capturing ? 0.5 : 1,
    transition: 'opacity 0.15s',
  })

  return (
    <>
      {/* ── 캡처용 카드: 항상 body에 포탈로 유지 (off-screen) ── */}
      {mounted && createPortal(
        <div style={{
          position: 'absolute',
          top: -9999,
          left: -9999,
          width: 1080,
          height: 1080,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
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
        </div>,
        document.body
      )}

      {/* ── 버튼 ── */}
      {variant === 'icon' ? (
        <>
          <button
            onClick={e => { e.stopPropagation(); handleSave() }}
            disabled={capturing}
            title={t('save')}
            style={iconStyle(false)}
          >
            <ArrowDownToLine size={14} strokeWidth={2} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); handleShare() }}
            disabled={capturing}
            title={t('share')}
            style={iconStyle(true)}
          >
            <Share2 size={14} strokeWidth={2} />
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={capturing} style={rowStyle(false)}>
            <ArrowDownToLine size={15} strokeWidth={2} />
            {t('save')}
          </button>
          <button onClick={handleShare} disabled={capturing} style={rowStyle(true)}>
            <Share2 size={15} strokeWidth={2} />
            {t('share')}
          </button>
        </div>
      )}
    </>
  )
}
