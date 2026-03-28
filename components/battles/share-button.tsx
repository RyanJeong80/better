'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { ArrowDownToLine, Share2 } from 'lucide-react'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'

const SHARE_URL = process.env.NEXT_PUBLIC_SHARE_URL || 'https://better-ivory.vercel.app'

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

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif'

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  if (!img.width || !img.height) return
  const scale = Math.max(dw / img.width, dh / img.height)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text.split('')) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length >= maxLines) break
    } else {
      line = test
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  return lines
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const blob = await fetch(url, { mode: 'cors', cache: 'no-store' }).then(r => r.blob())
  const objectUrl = URL.createObjectURL(blob)
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(img) }
    img.src = objectUrl
  })
}

// Canvas letterSpacing helper (supported in Chrome 99+, Safari 16.1+, Firefox 96+)
function setSpacing(ctx: CanvasRenderingContext2D, val: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ctx as any).letterSpacing = val
}

async function ensureFont(family: string, weights: string[]): Promise<void> {
  try {
    const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weights.join(';')}&display=swap`
      document.head.appendChild(link)
    }
    await Promise.all(weights.map(w => document.fonts.load(`${w} 64px "${family}"`)))
  } catch { /* fall back to system fonts */ }
}

async function buildShareCanvas(opts: {
  battleId: string
  imageAUrl: string
  imageBUrl: string
  pctA: number
  pctB: number
  winner: 'A' | 'B' | null
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
  winnerText: string
  scanDownloadText: string
  colorA: { bg: string; text: string }
  colorB: { bg: string; text: string }
}): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const PAD = 60
  const DISPLAY = '"Josefin Sans", sans-serif'

  // ── Load display font ────────────────────────────────
  await ensureFont('Josefin Sans', ['400', '700'])

  // ── Background ──────────────────────────────────────
  ctx.fillStyle = '#EDE4DA'
  ctx.fillRect(0, 0, W, H)

  // ── A/B images (large, from top) ────────────────────
  const imgY = 40
  const imgH = 560
  const imgW = (W - PAD * 2) / 2   // 480
  const imgXA = PAD                 // 60
  const imgXB = PAD + imgW          // 540

  ctx.save()
  ctx.beginPath()
  ctx.rect(imgXA, imgY, imgW * 2, imgH)
  ctx.clip()

  if (opts.isTextOnly) {
    ctx.fillStyle = opts.colorA.bg
    ctx.fillRect(imgXA, imgY, imgW, imgH)
    ctx.fillStyle = opts.colorA.text
    ctx.font = `700 32px ${FONT}`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    const linesA = wrapLines(ctx, opts.imageAText ?? '', imgW - 56, 5)
    const blockHA = linesA.length * Math.round(32 * 1.4)
    let tyA = imgY + (imgH - blockHA) / 2
    for (const l of linesA) { ctx.fillText(l, imgXA + imgW / 2, tyA); tyA += Math.round(32 * 1.4) }

    ctx.fillStyle = opts.colorB.bg
    ctx.fillRect(imgXB, imgY, imgW, imgH)
    ctx.fillStyle = opts.colorB.text
    const linesB = wrapLines(ctx, opts.imageBText ?? '', imgW - 56, 5)
    const blockHB = linesB.length * Math.round(32 * 1.4)
    let tyB = imgY + (imgH - blockHB) / 2
    for (const l of linesB) { ctx.fillText(l, imgXB + imgW / 2, tyB); tyB += Math.round(32 * 1.4) }
    ctx.textAlign = 'left'
  } else {
    const [imgA, imgB] = await Promise.all([loadImage(opts.imageAUrl), loadImage(opts.imageBUrl)])
    drawImageCover(ctx, imgA, imgXA, imgY, imgW, imgH)
    drawImageCover(ctx, imgB, imgXB, imgY, imgW, imgH)
  }

  // Gradient overlays
  for (const [gx, gw] of [[imgXA, imgW], [imgXB, imgW]] as [number, number][]) {
    const grad = ctx.createLinearGradient(gx, imgY + imgH, gx, imgY)
    grad.addColorStop(0, 'rgba(0,0,0,0.72)')
    grad.addColorStop(0.55, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(gx, imgY, gw, imgH)
  }

  ctx.restore()

  // A/B labels + percentages
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'white'
  ctx.font = `900 64px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('A', imgXA + 20, imgY + imgH - 18)
  ctx.font = `900 42px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(`${opts.pctA}%`, imgXA + imgW - 18, imgY + imgH - 22)

  ctx.font = `900 42px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(`${opts.pctB}%`, imgXB + 18, imgY + imgH - 22)
  ctx.font = `900 64px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText('B', imgXB + imgW - 20, imgY + imgH - 18)

  // VS badge
  const vsX = PAD + imgW   // 540
  const vsY = imgY + imgH / 2
  ctx.beginPath()
  ctx.arc(vsX, vsY, 34, 0, Math.PI * 2)
  ctx.fillStyle = '#1a1a1a'
  ctx.fill()
  ctx.strokeStyle = '#EDE4DA'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = 'white'
  ctx.font = `900 20px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('VS', vsX, vsY)

  // ── Logo stamp on winner card (white circle bg + glow) ──
  const logo = new Image()
  logo.crossOrigin = 'anonymous'
  await new Promise<void>(resolve => {
    logo.onload = () => resolve()
    logo.onerror = () => resolve()
    logo.src = window.location.origin + '/touched-logo.png'
  })

  if (opts.winner && logo.complete && logo.naturalWidth > 0) {
    const stampW = 150
    const stampH = logo.naturalHeight * (stampW / logo.naturalWidth)

    // 선택된 카드의 우측 상단
    const aCardRight = imgXA + imgW   // 540
    const bCardRight = imgXB + imgW   // 1020
    const cx = opts.winner === 'A'
      ? aCardRight - stampW * 0.6
      : bCardRight - stampW * 0.6
    const cy = imgY + stampH * 0.6

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-15 * Math.PI / 180)

    // White circular background
    ctx.beginPath()
    ctx.arc(0, 0, stampW * 0.55, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.fill()

    // White glow + logo on top
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
    ctx.shadowBlur = 20
    ctx.globalAlpha = 1.0
    ctx.drawImage(logo, -stampW / 2, -stampH / 2, stampW, stampH)

    ctx.restore()   // resets shadowBlur, globalAlpha, transform
  }

  let y = imgY + imgH + 32

  // ── Results bar ─────────────────────────────────────
  setSpacing(ctx, '0px')
  ctx.font = `800 28px ${FONT}`
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#1a1a1a'
  ctx.textAlign = 'left'
  ctx.fillText(`A · ${opts.pctA}%`, PAD, y)
  ctx.textAlign = 'right'
  ctx.fillText(`${opts.pctB}% · B`, W - PAD, y)
  y += 38

  const barW = W - PAD * 2
  rr(ctx, PAD, y, barW, 20, 10)
  ctx.fillStyle = '#c8bfb5'
  ctx.fill()

  const fillW = Math.round(barW * opts.pctA / 100)
  if (fillW > 0) {
    const barGrad = ctx.createLinearGradient(PAD, y, PAD + barW, y)
    barGrad.addColorStop(0, '#6366F1')
    barGrad.addColorStop(1, '#8B5CF6')
    rr(ctx, PAD, y, fillW, 20, 10)
    ctx.fillStyle = barGrad
    ctx.fill()
  }
  y += 20 + 32

  // ── Winner text ─────────────────────────────────────
  ctx.fillStyle = '#1a1a1a'
  ctx.font = `900 44px ${FONT}`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillText(opts.winnerText, PAD, y)

  // ── Bottom: QR code + TOUCHED + HI text ─────────────
  const qrSize = 88
  const boxPad = 8
  const boxSize = qrSize + boxPad * 2   // 104
  const scanTextLineH = Math.round(22 * 1.4)
  const qrBoxX = PAD
  const qrBoxY = H - PAD - boxSize - 10 - scanTextLineH   // ≈ 875

  // QR white box
  rr(ctx, qrBoxX, qrBoxY, boxSize, boxSize, 12)
  ctx.fillStyle = 'white'
  ctx.fill()

  const QRCode = (await import('qrcode')).default
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, `${SHARE_URL}/?id=${opts.battleId}`, {
    width: qrSize, margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
  })
  ctx.drawImage(qrCanvas, qrBoxX + boxPad, qrBoxY + boxPad, qrSize, qrSize)

  // Download text below QR
  setSpacing(ctx, '0px')
  ctx.fillStyle = '#6b6058'
  ctx.font = `600 22px ${FONT}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(opts.scanDownloadText, qrBoxX, qrBoxY + boxSize + 10)

  // ── TOUCHED (Josefin Sans, wide spacing) ─────────────
  const TOUCHED_SIZE = 64
  const TOUCHED_SPACING = '8px'
  ctx.font = `700 ${TOUCHED_SIZE}px ${DISPLAY}`
  setSpacing(ctx, TOUCHED_SPACING)
  const touchedWidth = ctx.measureText('TOUCHED').width

  // ── HI text auto-sized to match TOUCHED width ────────
  setSpacing(ctx, '0px')
  let hiSize = 14
  while (hiSize < 60) {
    ctx.font = `400 ${hiSize}px ${DISPLAY}`
    if (ctx.measureText('HI(Human Intelligence)').width >= touchedWidth) break
    hiSize++
  }

  // Vertical centering: [TOUCHED + gap + HI] within QR box height
  const TEXT_GAP = 10
  const totalTextH = TOUCHED_SIZE + TEXT_GAP + hiSize
  const textStartY = qrBoxY + Math.round((boxSize - totalTextH) / 2)

  // Draw TOUCHED
  ctx.fillStyle = '#3D2B1F'
  ctx.font = `700 ${TOUCHED_SIZE}px ${DISPLAY}`
  setSpacing(ctx, TOUCHED_SPACING)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('TOUCHED', W - PAD, textStartY)

  // Draw HI
  setSpacing(ctx, '0px')
  ctx.font = `400 ${hiSize}px ${DISPLAY}`
  ctx.fillStyle = '#3D2B1F'
  ctx.fillText('HI(Human Intelligence)', W - PAD, textStartY + TOUCHED_SIZE + TEXT_GAP)

  // Reset spacing
  setSpacing(ctx, '0px')

  return canvas
}

export function ShareButton({
  battleId, title, imageAUrl, imageBUrl,
  pctA, pctB, total, winner,
  isTextOnly, imageAText, imageBText,
  variant = 'row',
}: ShareButtonProps) {
  const [capturing, setCapturing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'save' | 'share' | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const t = useTranslations('share')

  useEffect(() => { setMounted(true) }, [])

  const colorA = TEXT_BG_COLORS[getTextColorIdx(battleId, 0)]
  const colorB = TEXT_BG_COLORS[getTextColorIdx(battleId, 1)]

  const winnerText =
    winner === 'A' ? t('winnerA', { percent: pctA })
    : winner === 'B' ? t('winnerB', { percent: pctB })
    : t('tie', { percent: Math.max(pctA, pctB) })

  async function openPreview(mode: 'save' | 'share') {
    if (capturing) return
    setCapturing(true)
    try {
      const canvas = await buildShareCanvas({
        battleId, imageAUrl, imageBUrl,
        pctA, pctB, winner, isTextOnly, imageAText, imageBText,
        winnerText,
        scanDownloadText: t('scanDownload'),
        colorA, colorB,
      })
      canvasRef.current = canvas
      setPreviewUrl(canvas.toDataURL('image/png'))
      setPreviewMode(mode)
    } catch (e) {
      console.error('[Touched] 미리보기 생성 실패:', e)
    } finally {
      setCapturing(false)
    }
  }

  function closePreview() {
    setPreviewUrl(null)
    setPreviewMode(null)
    canvasRef.current = null
  }

  async function confirmAction() {
    const canvas = canvasRef.current
    if (!canvas) return

    if (previewMode === 'share') {
      try {
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
        )
        const file = new File([blob], 'touched-result.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          closePreview()
          await navigator.share({ title, files: [file] })
          return
        }
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') { closePreview(); return }
        console.error('[Touched] 공유 실패:', e)
      }
    }

    // save (or share fallback)
    const link = document.createElement('a')
    link.download = 'touched-result.png'
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    closePreview()
  }

  // ── 스타일 ──────────────────────────────────────────
  const spinner = (light: boolean) => (
    <span style={{
      width: 14, height: 14,
      border: `2px solid ${light ? 'rgba(255,255,255,0.4)' : 'var(--color-border)'}`,
      borderTopColor: light ? 'white' : 'var(--color-foreground)',
      borderRadius: '50%', display: 'inline-block',
      animation: 'spin 0.6s linear infinite',
    }} />
  )

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
      {/* ── 버튼 ── */}
      {variant === 'icon' ? (
        <>
          <button
            onClick={e => { e.stopPropagation(); openPreview('save') }}
            disabled={capturing}
            title={t('save')}
            style={iconStyle(false)}
          >
            {capturing ? spinner(false) : <ArrowDownToLine size={14} strokeWidth={2} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); openPreview('share') }}
            disabled={capturing}
            title={t('share')}
            style={iconStyle(true)}
          >
            {capturing ? spinner(true) : <Share2 size={14} strokeWidth={2} />}
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openPreview('save')} disabled={capturing} style={rowStyle(false)}>
            {capturing ? spinner(false) : <ArrowDownToLine size={15} strokeWidth={2} />}
            {t('save')}
          </button>
          <button onClick={() => openPreview('share')} disabled={capturing} style={rowStyle(true)}>
            {capturing ? spinner(true) : <Share2 size={15} strokeWidth={2} />}
            {t('share')}
          </button>
        </div>
      )}

      {/* ── 미리보기 모달 ── */}
      {mounted && previewUrl && createPortal(
        <div
          onClick={closePreview}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-card)',
              borderRadius: 20,
              overflow: 'hidden',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="share preview" style={{ width: '100%', display: 'block' }} />
            <div style={{ display: 'flex', gap: 10, padding: '14px 16px' }}>
              <button
                onClick={closePreview}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: '1.5px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-foreground)',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmAction}
                style={{
                  flex: 2, padding: '11px 0', borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                  color: 'white',
                  fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {previewMode === 'save' ? t('saveAction') : t('shareAction')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
