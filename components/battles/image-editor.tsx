'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Check, Crop, Type, RotateCw, Plus } from 'lucide-react'

type Mode = 'crop' | 'text'
type AspectKey = '3:4' | '1:1' | 'free'

interface Props {
  file: File
  onDone: (blob: Blob) => void
  onCancel: () => void
}

// ─── 크롭 오버레이 업데이트 ────────────────────────────────────────
function updateOverlay(canvas: any, crop: any, overlays: any[]) {
  const W = canvas.width as number
  const H = canvas.height as number
  const cL = crop.left as number
  const cT = crop.top as number
  const cW = crop.getScaledWidth() as number
  const cH = crop.getScaledHeight() as number

  const [top, bottom, left, right] = overlays
  top.set    ({ left: 0,    top: 0,       width: W,          height: cT          })
  bottom.set ({ left: 0,    top: cT + cH, width: W,          height: H - cT - cH })
  left.set   ({ left: 0,    top: cT,      width: cL,         height: cH          })
  right.set  ({ left: cL + cW, top: cT,  width: W - cL - cW, height: cH         })
  canvas.requestRenderAll()
}

// fabric를 한 번만 동적 import하여 캐싱
let fabricModuleCache: any = null
async function getFabric() {
  if (!fabricModuleCache) {
    const mod = await import('fabric')
    // CJS interop: if named exports aren't at top level, unwrap from .default
    fabricModuleCache = (mod as any).Canvas ? mod : ((mod as any).default ?? mod)
  }
  return fabricModuleCache
}

export function ImageEditor({ file, onDone, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const fc           = useRef<any>(null)   // fabric.Canvas
  const imgObj       = useRef<any>(null)   // fabric.FabricImage
  const cropObj      = useRef<any>(null)   // fabric.Rect (crop handle)
  const overlayRefs  = useRef<any[]>([])   // 4 dark overlay rects

  const [mode, setMode]       = useState<Mode>('crop')
  const [aspect, setAspect]   = useState<AspectKey>('3:4')
  const [fontSize, setFontSize] = useState(36)
  const [textColor, setTextColor] = useState('#ffffff')
  const [hasBg, setHasBg]     = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const aspectRef = useRef<AspectKey>('3:4')
  aspectRef.current = aspect

  // ── 크롭 사각형 초기화 헬퍼 ────────────────────────────────────
  function buildCropRect(fabricModule: any, canvas: any, img: any, asp: AspectKey) {
    const { Rect } = fabricModule
    const dW = img.getScaledWidth()
    const dH = img.getScaledHeight()
    const iL = img.left as number
    const iT = img.top  as number

    const baseW = 300
    const baseH = asp === '3:4' ? 400 : asp === '1:1' ? 300 : 250
    const maxS  = Math.min((dW * 0.88) / baseW, (dH * 0.88) / baseH)

    const cropRect = new Rect({
      left:   iL + (dW - baseW * maxS) / 2,
      top:    iT + (dH - baseH * maxS) / 2,
      width:  baseW,
      height: baseH,
      scaleX: maxS,
      scaleY: maxS,
      fill:              'transparent',
      stroke:            '#ffffff',
      strokeWidth:       2 / maxS,
      strokeDashArray:   [8 / maxS, 5 / maxS],
      cornerColor:       '#ffffff',
      cornerStrokeColor: '#4a4a4a',
      cornerSize:        14,
      transparentCorners: false,
      selectable:   true,
      lockRotation: true,
      lockUniScaling: asp !== 'free',
      originX: 'left',
      originY: 'top',
    })
    return cropRect
  }

  // ── Canvas 초기화 ───────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false
    let fabricCanvas: any

    ;(async () => {
      const fm = await getFabric()
      const { Canvas, FabricImage, Rect } = fm
      if (destroyed || !canvasRef.current || !containerRef.current) return

      const container = containerRef.current
      const W = container.clientWidth
      const H = container.clientHeight

      canvasRef.current.width  = W
      canvasRef.current.height = H

      fabricCanvas = new Canvas(canvasRef.current, {
        selection: false,
        preserveObjectStacking: true,
        renderOnAddRemove: false,
      })
      fc.current = fabricCanvas

      // 이미지 로드
      const url = URL.createObjectURL(file)
      let img: any
      try { img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' }) }
      catch { img = await FabricImage.fromURL(url) }
      URL.revokeObjectURL(url)
      if (destroyed) return

      const iW = img.width  as number
      const iH = img.height as number
      const scale = Math.min(W / iW, H / iH) * 0.92
      img.set({
        left: (W - iW * scale) / 2,
        top:  (H - iH * scale) / 2,
        scaleX: scale, scaleY: scale,
        selectable: false, evented: false,
        originX: 'left', originY: 'top',
      })
      fabricCanvas.add(img)
      imgObj.current = img

      // 4개 어두운 오버레이
      const overlayStyle = { fill: 'rgba(0,0,0,0.52)', selectable: false, evented: false, originX: 'left' as const, originY: 'top' as const }
      const overlays = [
        new Rect(overlayStyle), new Rect(overlayStyle),
        new Rect(overlayStyle), new Rect(overlayStyle),
      ]
      overlays.forEach(r => fabricCanvas.add(r))
      overlayRefs.current = overlays

      // 크롭 사각형
      const cropRect = buildCropRect(fm, fabricCanvas, img, '3:4')
      fabricCanvas.add(cropRect)
      fabricCanvas.setActiveObject(cropRect)
      cropObj.current = cropRect

      // 오버레이 업데이트 이벤트
      const refresh = () => updateOverlay(fabricCanvas, cropRect, overlays)
      cropRect.on('moving', refresh)
      cropRect.on('scaling', refresh)
      updateOverlay(fabricCanvas, cropRect, overlays)

      fabricCanvas.requestRenderAll()
    })()

    return () => {
      destroyed = true
      try { fabricCanvas?.dispose() } catch {}
      fc.current = null; imgObj.current = null; cropObj.current = null
      overlayRefs.current = []
    }
  }, [file])

  // ── 핀치 줌 ────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let lastDist = 0

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        )
      }
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !fc.current) return
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      )
      if (!lastDist) { lastDist = dist; return }
      const scale = dist / lastDist
      let zoom = fc.current.getZoom() * scale
      zoom = Math.max(0.5, Math.min(6, zoom))
      const rect = container.getBoundingClientRect()
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
      fc.current.zoomToPoint({ x: cx, y: cy }, zoom)
      lastDist = dist
    }
    container.addEventListener('touchstart', onStart, { passive: true })
    container.addEventListener('touchmove', onMove, { passive: false })
    return () => {
      container.removeEventListener('touchstart', onStart)
      container.removeEventListener('touchmove', onMove)
    }
  }, [])

  // ── 비율 변경 ──────────────────────────────────────────────────
  const changeAspect = useCallback(async (newAsp: AspectKey) => {
    setAspect(newAsp)
    const canvas = fc.current
    const img    = imgObj.current
    const oldCrop = cropObj.current
    if (!canvas || !img) return

    const fm = await getFabric()

    if (oldCrop) {
      canvas.remove(oldCrop)
      cropObj.current = null
    }

    const cropRect = buildCropRect(fm, canvas, img, newAsp)
    canvas.add(cropRect)
    canvas.setActiveObject(cropRect)
    cropObj.current = cropRect

    const refresh = () => updateOverlay(canvas, cropRect, overlayRefs.current)
    cropRect.on('moving', refresh)
    cropRect.on('scaling', refresh)
    updateOverlay(canvas, cropRect, overlayRefs.current)
    canvas.requestRenderAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 모드 전환 ──────────────────────────────────────────────────
  function switchMode(newMode: Mode) {
    setMode(newMode)
    const canvas = fc.current
    const crop   = cropObj.current
    if (!canvas) return

    if (newMode === 'crop') {
      overlayRefs.current.forEach(r => r.set({ visible: true }))
      if (crop) { crop.set({ selectable: true, evented: true, visible: true }); canvas.setActiveObject(crop) }
    } else {
      canvas.discardActiveObject()
      if (crop) crop.set({ selectable: false, evented: false })
      overlayRefs.current.forEach(r => r.set({ visible: false }))
    }
    canvas.requestRenderAll()
  }

  // ── 텍스트 추가 ────────────────────────────────────────────────
  async function addText() {
    const { IText } = await getFabric()
    const canvas = fc.current
    if (!canvas) return
    const text = new IText('텍스트 입력', {
      left: canvas.width / 2,
      top:  canvas.height / 2,
      originX: 'center',
      originY: 'center',
      fontSize,
      fill: textColor,
      fontFamily: "'Plus Jakarta Sans', 'Pretendard Variable', sans-serif",
      fontWeight: '700',
      backgroundColor: hasBg ? 'rgba(0,0,0,0.55)' : '',
      selectable: true,
      evented: true,
      editable: true,
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.requestRenderAll()
    // 더블탭으로 편집 모드 진입
    setTimeout(() => text.enterEditing?.(), 100)
  }

  // ── 90° 회전 ───────────────────────────────────────────────────
  async function rotateImage() {
    const canvas = fc.current
    const img    = imgObj.current
    if (!canvas || !img) return

    const newAngle = ((img.angle || 0) + 90) % 360
    img.set({ angle: newAngle })
    img.setCoords?.()

    // 캔버스 중앙에 재배치
    const dW = img.getScaledWidth()
    const dH = img.getScaledHeight()
    img.set({ left: (canvas.width - dW) / 2, top: (canvas.height - dH) / 2 })
    img.setCoords?.()

    // 크롭 박스 재배치
    const fm = await getFabric()
    const old = cropObj.current
    if (old) { canvas.remove(old); cropObj.current = null }

    const cropRect = buildCropRect(fm, canvas, img, aspectRef.current)
    canvas.add(cropRect)
    canvas.setActiveObject(cropRect)
    cropObj.current = cropRect

    const refresh = () => updateOverlay(canvas, cropRect, overlayRefs.current)
    cropRect.on('moving', refresh)
    cropRect.on('scaling', refresh)
    updateOverlay(canvas, cropRect, overlayRefs.current)
    canvas.requestRenderAll()
  }

  // ── 완료: 크롭 후 blob 반환 ────────────────────────────────────
  async function handleDone() {
    const canvas = fc.current
    const crop   = cropObj.current
    if (!canvas || isExporting) return
    setIsExporting(true)

    try {
      // viewport 리셋 후 export (좌표계 일치)
      const savedVpt = [...(canvas.viewportTransform || [1,0,0,1,0,0])]
      canvas.setViewportTransform([1,0,0,1,0,0])

      // 크롭 rect 및 오버레이 숨김
      canvas.discardActiveObject()
      overlayRefs.current.forEach(r => r.set({ visible: false }))
      if (crop) crop.set({ visible: false })
      canvas.requestRenderAll()
      await new Promise(r => setTimeout(r, 60))

      const left   = crop?.left ?? 0
      const top    = crop?.top  ?? 0
      const width  = crop ? crop.getScaledWidth()  : (canvas.width  as number)
      const height = crop ? crop.getScaledHeight() : (canvas.height as number)

      const dataUrl = canvas.toDataURL({ left, top, width, height, multiplier: 3, format: 'jpeg', quality: 0.92 })

      // 복원
      if (crop) crop.set({ visible: true })
      overlayRefs.current.forEach(r => r.set({ visible: mode === 'crop' }))
      canvas.setViewportTransform(savedVpt)
      canvas.requestRenderAll()

      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      onDone(blob)
    } catch (e) {
      console.error('[ImageEditor] export error:', e)
      if (crop) crop.set({ visible: true })
      canvas.requestRenderAll()
      setIsExporting(false)
    }
  }

  // ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ touchAction: 'none' }}
    >
      <style>{`@keyframes _spin { to { transform:rotate(360deg) } }`}</style>

      {/* ── 상단 바 ── */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={onCancel}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} color="white" />
        </button>

        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>사진 편집</span>

        <button
          onClick={handleDone}
          disabled={isExporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 16px', height: 36, borderRadius: 999,
            background: isExporting ? 'rgba(99,102,241,0.6)' : '#6366F1',
            border: 'none', cursor: isExporting ? 'default' : 'pointer',
          }}
        >
          {isExporting
            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: '_spin 0.7s linear infinite' }} />
            : <Check size={15} color="white" />
          }
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.82rem' }}>완료</span>
        </button>
      </div>

      {/* ── 캔버스 ── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: '#111' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {/* ── 크롭 옵션 ── */}
      {mode === 'crop' && (
        <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 shrink-0" style={{ background: 'rgba(10,10,10,0.9)' }}>
          {(['3:4', '1:1', 'free'] as const).map((a) => (
            <button
              key={a}
              onClick={() => changeAspect(a)}
              style={{
                padding: '4px 14px', borderRadius: 999,
                fontSize: '0.75rem', fontWeight: 700,
                background: aspect === a ? 'white' : 'rgba(255,255,255,0.14)',
                color: aspect === a ? '#18181b' : 'white',
                border: 'none', cursor: 'pointer',
              }}
            >
              {a === 'free' ? '자유' : a}
            </button>
          ))}
        </div>
      )}

      {/* ── 텍스트 옵션 ── */}
      {mode === 'text' && (
        <div className="shrink-0 px-4 py-3 space-y-2.5" style={{ background: 'rgba(10,10,10,0.9)' }}>
          <div className="flex items-center gap-4 flex-wrap">
            {/* 폰트 크기 */}
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>크기</span>
              {([{ label: '소', size: 20 }, { label: '중', size: 36 }, { label: '대', size: 58 }]).map(({ label, size }) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  style={{
                    width: 34, height: 30, borderRadius: 8,
                    fontSize: '0.75rem', fontWeight: 700,
                    background: fontSize === size ? 'white' : 'rgba(255,255,255,0.14)',
                    color: fontSize === size ? '#18181b' : 'white',
                    border: 'none', cursor: 'pointer',
                  }}
                >{label}</button>
              ))}
            </div>

            {/* 텍스트 색상 */}
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>색상</span>
              {([['#ffffff', '흰색'], ['#000000', '검정'], ['#FFD600', '노랑']] as const).map(([color, label]) => (
                <button
                  key={color}
                  title={label}
                  onClick={() => setTextColor(color)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: color,
                    border: textColor === color ? '3px solid #6366F1' : color === '#ffffff' ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* 배경 토글 */}
            <button
              onClick={() => setHasBg(b => !b)}
              style={{
                padding: '4px 12px', borderRadius: 6,
                fontSize: '0.72rem', fontWeight: 600,
                background: hasBg ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.14)',
                color: hasBg ? '#18181b' : 'white',
                border: 'none', cursor: 'pointer',
              }}
            >
              배경
            </button>
          </div>

          <button
            onClick={addText}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0', borderRadius: 12,
              background: '#6366F1', color: 'white',
              fontWeight: 700, fontSize: '0.85rem',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={16} /> 텍스트 추가
          </button>
        </div>
      )}

      {/* ── 하단 툴바 ── */}
      <div
        className="flex justify-around items-center px-6 py-4 shrink-0"
        style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {[
          { id: 'crop', label: '크롭',   Icon: Crop,     onClick: () => switchMode('crop') },
          { id: 'text', label: '텍스트', Icon: Type,     onClick: () => switchMode('text') },
          { id: 'rot',  label: '회전',   Icon: RotateCw, onClick: rotateImage              },
        ].map(({ id, label, Icon, onClick }) => {
          const active = (id === 'crop' && mode === 'crop') || (id === 'text' && mode === 'text')
          return (
            <button
              key={id}
              onClick={onClick}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Icon size={22} color={active ? '#818CF8' : 'rgba(255,255,255,0.65)'} />
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: active ? '#818CF8' : 'rgba(255,255,255,0.45)' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
