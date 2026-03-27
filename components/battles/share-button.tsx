'use client'

import { useState } from 'react'
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

function rr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
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

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  // Try character-by-character for CJK text + space-split for Latin
  const segments = text.split('')
  let line = ''
  for (const ch of segments) {
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

async function buildShareCanvas(opts: {
  battleId: string
  title: string
  imageAUrl: string
  imageBUrl: string
  pctA: number
  pctB: number
  total: number
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
  winnerText: string
  participantsText: string
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
  let y = PAD

  // ── Background ─────────────────────────────────────
  ctx.fillStyle = '#EDE4DA'
  ctx.fillRect(0, 0, W, H)

  // ── Header: logo box + "Touched" ────────────────────
  rr(ctx, PAD, y, 52, 52, 14)
  ctx.fillStyle = '#1a1a1a'
  ctx.fill()
  ctx.font = `30px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText('🦦', PAD + 26, y + 27)
  ctx.font = `800 38px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1a1a1a'
  ctx.fillText('Touched', PAD + 68, y + 27)
  y += 52 + 36

  // ── Title ───────────────────────────────────────────
  ctx.font = `700 34px ${FONT}`
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#1a1a1a'
  const titleLines = wrapLines(ctx, opts.title, W - PAD * 2, 2)
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += Math.round(34 * 1.3)
  }
  y += 24

  // ── A/B images ──────────────────────────────────────
  const imgH = 420
  const imgW = (W - PAD * 2) / 2
  const imgXA = PAD
  const imgXB = PAD + imgW

  // Clip to image row
  ctx.save()
  ctx.beginPath()
  ctx.rect(imgXA, y, imgW * 2, imgH)
  ctx.clip()

  if (opts.isTextOnly) {
    // Side A
    ctx.fillStyle = opts.colorA.bg
    ctx.fillRect(imgXA, y, imgW, imgH)
    ctx.fillStyle = opts.colorA.text
    ctx.font = `700 30px ${FONT}`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    const linesA = wrapLines(ctx, opts.imageAText ?? '', imgW - 48, 5)
    const blockHA = linesA.length * Math.round(30 * 1.4)
    let tyA = y + (imgH - blockHA) / 2
    for (const line of linesA) { ctx.fillText(line, imgXA + imgW / 2, tyA); tyA += Math.round(30 * 1.4) }

    // Side B
    ctx.fillStyle = opts.colorB.bg
    ctx.fillRect(imgXB, y, imgW, imgH)
    ctx.fillStyle = opts.colorB.text
    const linesB = wrapLines(ctx, opts.imageBText ?? '', imgW - 48, 5)
    const blockHB = linesB.length * Math.round(30 * 1.4)
    let tyB = y + (imgH - blockHB) / 2
    for (const line of linesB) { ctx.fillText(line, imgXB + imgW / 2, tyB); tyB += Math.round(30 * 1.4) }
    ctx.textAlign = 'left'
  } else {
    const [imgA, imgB] = await Promise.all([
      loadImage(opts.imageAUrl),
      loadImage(opts.imageBUrl),
    ])
    drawImageCover(ctx, imgA, imgXA, y, imgW, imgH)
    drawImageCover(ctx, imgB, imgXB, y, imgW, imgH)
  }

  // Gradient overlays
  for (const [gx, gw] of [[imgXA, imgW], [imgXB, imgW]] as [number, number][]) {
    const grad = ctx.createLinearGradient(gx, y + imgH, gx, y)
    grad.addColorStop(0, 'rgba(0,0,0,0.72)')
    grad.addColorStop(0.55, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(gx, y, gw, imgH)
  }

  ctx.restore()

  // Labels + percentages on images
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'white'
  ctx.font = `900 60px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('A', imgXA + 20, y + imgH - 16)
  ctx.font = `900 38px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(`${opts.pctA}%`, imgXA + imgW - 16, y + imgH - 20)

  ctx.font = `900 38px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(`${opts.pctB}%`, imgXB + 16, y + imgH - 20)
  ctx.font = `900 60px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText('B', imgXB + imgW - 20, y + imgH - 16)

  // VS badge
  const vsX = PAD + imgW
  const vsY = y + imgH / 2
  ctx.beginPath()
  ctx.arc(vsX, vsY, 32, 0, Math.PI * 2)
  ctx.fillStyle = '#1a1a1a'
  ctx.fill()
  ctx.strokeStyle = '#EDE4DA'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = 'white'
  ctx.font = `900 18px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('VS', vsX, vsY)

  y += imgH + 28

  // ── Results bar ─────────────────────────────────────
  ctx.font = `800 26px ${FONT}`
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#1a1a1a'
  ctx.textAlign = 'left'
  ctx.fillText(`A · ${opts.pctA}%`, PAD, y)
  ctx.textAlign = 'right'
  ctx.fillText(`${opts.pctB}% · B`, W - PAD, y)
  y += 36

  const barW = W - PAD * 2
  rr(ctx, PAD, y, barW, 18, 9)
  ctx.fillStyle = '#c8bfb5'
  ctx.fill()

  const fillW = Math.round(barW * opts.pctA / 100)
  if (fillW > 0) {
    const barGrad = ctx.createLinearGradient(PAD, y, PAD + barW, y)
    barGrad.addColorStop(0, '#6366F1')
    barGrad.addColorStop(1, '#8B5CF6')
    rr(ctx, PAD, y, fillW, 18, 9)
    ctx.fillStyle = barGrad
    ctx.fill()
  }
  y += 18 + 28

  // ── Winner text ─────────────────────────────────────
  ctx.fillStyle = '#1a1a1a'
  ctx.font = `900 42px ${FONT}`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillText(opts.winnerText, PAD, y)
  y += Math.round(42 * 1.2) + 10

  // ── Participants ────────────────────────────────────
  ctx.fillStyle = '#6b6058'
  ctx.font = `600 26px ${FONT}`
  ctx.fillText(opts.participantsText, PAD, y)

  // ── QR code (bottom) ────────────────────────────────
  const qrSize = 88
  const boxPad = 8
  const boxSize = qrSize + boxPad * 2
  const qrBoxX = PAD
  const qrBoxY = H - PAD - boxSize

  rr(ctx, qrBoxX, qrBoxY, boxSize, boxSize, 12)
  ctx.fillStyle = 'white'
  ctx.fill()

  const QRCode = (await import('qrcode')).default
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, SHARE_URL, { width: qrSize, margin: 0, color: { dark: '#000000', light: '#ffffff' } })
  ctx.drawImage(qrCanvas, qrBoxX + boxPad, qrBoxY + boxPad, qrSize, qrSize)

  // Scan/download text
  ctx.fillStyle = '#1a1a1a'
  ctx.font = `700 26px ${FONT}`
  ctx.textAlign = 'right'
  const scanLines = wrapLines(ctx, opts.scanDownloadText, 280, 3)
  const scanBlockH = scanLines.length * Math.round(26 * 1.4)
  let scanY = qrBoxY + (boxSize - scanBlockH) / 2
  ctx.textBaseline = 'top'
  for (const line of scanLines) {
    ctx.fillText(line, W - PAD, scanY)
    scanY += Math.round(26 * 1.4)
  }

  return canvas
}

export function ShareButton({
  battleId, title, imageAUrl, imageBUrl,
  pctA, pctB, total, winner,
  isTextOnly, imageAText, imageBText,
  variant = 'row',
}: ShareButtonProps) {
  const [capturing, setCapturing] = useState(false)
  const t = useTranslations('share')

  const colorA = TEXT_BG_COLORS[getTextColorIdx(battleId, 0)]
  const colorB = TEXT_BG_COLORS[getTextColorIdx(battleId, 1)]

  const winnerText =
    winner === 'A' ? t('winnerA', { percent: pctA })
    : winner === 'B' ? t('winnerB', { percent: pctB })
    : t('tie', { percent: Math.max(pctA, pctB) })

  async function getCanvas() {
    return buildShareCanvas({
      battleId, title, imageAUrl, imageBUrl,
      pctA, pctB, total, isTextOnly, imageAText, imageBText,
      winnerText,
      participantsText: t('participants', { count: total }),
      scanDownloadText: t('scanDownload'),
      colorA, colorB,
    })
  }

  async function handleSave() {
    if (capturing) return
    setCapturing(true)
    try {
      const canvas = await getCanvas()
      const link = document.createElement('a')
      link.download = 'touched-result.png'
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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
      const canvas = await getCanvas()
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
      )
      const file = new File([blob], 'touched-result.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: t('shareTitle'), files: [file] })
      } else {
        const link = document.createElement('a')
        link.download = 'touched-result.png'
        link.href = canvas.toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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

  return variant === 'icon' ? (
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
  )
}
