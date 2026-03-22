'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Check, Crop, Type, RotateCw, Plus, Bold, Italic, Undo2 } from 'lucide-react'

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
  top.set    ({ left: 0,    top: 0,       width: W,           height: cT          })
  bottom.set ({ left: 0,    top: cT + cH, width: W,           height: H - cT - cH })
  left.set   ({ left: 0,    top: cT,      width: cL,          height: cH          })
  right.set  ({ left: cL + cW, top: cT,  width: W - cL - cW, height: cH          })
  canvas.requestRenderAll()
}

// fabric를 한 번만 동적 import하여 캐싱
let fabricModuleCache: any = null
async function getFabric() {
  if (!fabricModuleCache) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error: URL path import not typed
    fabricModuleCache = await import(/* webpackIgnore: true */ '/vendor/fabric.mjs')
  }
  return fabricModuleCache
}

export function ImageEditor({ file, onDone, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const fc           = useRef<any>(null)
  const imgObj       = useRef<any>(null)
  const cropObj      = useRef<any>(null)
  const overlayRefs  = useRef<any[]>([])
  const textHistoryRef = useRef<any[]>([])   // undo 스택

  const [mode, setMode]         = useState<Mode>('crop')
  const [aspect, setAspect]     = useState<AspectKey>('3:4')
  const [fontSize, setFontSize] = useState(36)
  const [textColor, setTextColor] = useState('#ffffff')
  const [hasBg, setHasBg]       = useState(false)
  const [isBold, setIsBold]     = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // 텍스트 입력 오버레이
  const [textInputShown, setTextInputShown] = useState(false)
  const [textInputValue, setTextInputValue] = useState('')
  const [editingTextObj, setEditingTextObj] = useState<any>(null)

  // 선택된 텍스트 객체 + X 버튼 위치
  const [selectedTextObj, setSelectedTextObj] = useState<any>(null)
  const [deleteBtnPos, setDeleteBtnPos] = useState<{ x: number; y: number } | null>(null)

  const aspectRef = useRef<AspectKey>('3:4')
  aspectRef.current = aspect

  // ── 선택된 텍스트에 스타일 즉시 적용 ───────────────────────────
  const applyToSelected = useCallback((patch: Record<string, any>) => {
    const canvas = fc.current
    const obj = canvas?.getActiveObject()
    if (obj?.type === 'i-text') {
      obj.set(patch)
      canvas.renderAll()
    }
  }, [])

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

    return new Rect({
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

      const overlayStyle = { fill: 'rgba(0,0,0,0.52)', selectable: false, evented: false, originX: 'left' as const, originY: 'top' as const }
      const overlays = [
        new Rect(overlayStyle), new Rect(overlayStyle),
        new Rect(overlayStyle), new Rect(overlayStyle),
      ]
      overlays.forEach(r => fabricCanvas.add(r))
      overlayRefs.current = overlays

      const cropRect = buildCropRect(fm, fabricCanvas, img, '3:4')
      fabricCanvas.add(cropRect)
      fabricCanvas.setActiveObject(cropRect)
      cropObj.current = cropRect

      const refresh = () => updateOverlay(fabricCanvas, cropRect, overlays)
      cropRect.on('moving', refresh)
      cropRect.on('scaling', refresh)
      updateOverlay(fabricCanvas, cropRect, overlays)

      // ── 텍스트 객체 선택 시 패널 동기화 + X 버튼 위치 계산 ──
      const calcDeletePos = (obj: any) => {
        const rect = obj.getBoundingRect()
        setDeleteBtnPos({ x: rect.left + rect.width, y: rect.top })
      }
      const syncSelected = (obj: any) => {
        if (obj?.type === 'i-text') {
          setSelectedTextObj(obj)
          setFontSize(Number(obj.fontSize) || 36)
          setTextColor((obj.fill as string) || '#ffffff')
          setHasBg(!!obj.backgroundColor)
          setIsBold(obj.fontWeight === '700' || obj.fontWeight === 'bold')
          setIsItalic(obj.fontStyle === 'italic')
          calcDeletePos(obj)
        } else {
          setSelectedTextObj(null)
          setDeleteBtnPos(null)
        }
      }
      fabricCanvas.on('selection:created', (e: any) => syncSelected(e.selected?.[0]))
      fabricCanvas.on('selection:updated', (e: any) => syncSelected(e.selected?.[0]))
      fabricCanvas.on('selection:cleared', () => { setSelectedTextObj(null); setDeleteBtnPos(null) })
      // 이동/크기 변경 시 X 버튼 위치 실시간 업데이트
      fabricCanvas.on('object:moving',  (e: any) => { if (e.target?.type === 'i-text') calcDeletePos(e.target) })
      fabricCanvas.on('object:scaling', (e: any) => { if (e.target?.type === 'i-text') calcDeletePos(e.target) })

      // ── 더블탭/더블클릭으로 텍스트 편집 ─────────────────────
      fabricCanvas.on('mouse:dblclick', (e: any) => {
        const obj = e.target
        if (obj?.type === 'i-text') {
          setEditingTextObj(obj)
          setTextInputValue(obj.text || '')
          setTextInputShown(true)
        }
      })

      fabricCanvas.requestRenderAll()
    })()

    return () => {
      destroyed = true
      try { fabricCanvas?.dispose() } catch {}
      fc.current = null; imgObj.current = null; cropObj.current = null
      overlayRefs.current = []; textHistoryRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // ── 키보드 Delete/Backspace 로 선택된 텍스트 삭제 ─────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textInputShown) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const canvas = fc.current
        const obj = canvas?.getActiveObject()
        if (obj?.type === 'i-text') {
          e.preventDefault()
          removeTextObj(obj)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [textInputShown])

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

  // ── 텍스트 객체 제거 ────────────────────────────────────────────
  function removeTextObj(obj: any) {
    const canvas = fc.current
    if (!canvas) return
    canvas.remove(obj)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    setSelectedTextObj(null)
    setDeleteBtnPos(null)
    textHistoryRef.current = textHistoryRef.current.filter((t: any) => t !== obj)
  }

  function deleteSelected() {
    const canvas = fc.current
    const obj = canvas?.getActiveObject()
    if (obj?.type === 'i-text') removeTextObj(obj)
  }

  // ── 실행취소: 마지막 추가 텍스트 제거 ───────────────────────────
  function undoLastText() {
    if (textHistoryRef.current.length === 0) return
    const last = textHistoryRef.current[textHistoryRef.current.length - 1]
    removeTextObj(last)
  }

  // ── 비율 변경 ──────────────────────────────────────────────────
  const changeAspect = useCallback(async (newAsp: AspectKey) => {
    setAspect(newAsp)
    const canvas = fc.current
    const img    = imgObj.current
    const oldCrop = cropObj.current
    if (!canvas || !img) return

    const fm = await getFabric()
    if (oldCrop) { canvas.remove(oldCrop); cropObj.current = null }

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

  // ── 텍스트 캔버스에 배치 ─────────────────────────────────────────
  async function placeText(value: string) {
    const { IText } = await getFabric()
    const canvas = fc.current
    if (!canvas || !value.trim()) return
    const text = new IText(value.trim(), {
      left: canvas.width / 2,
      top:  canvas.height / 2,
      originX: 'center',
      originY: 'center',
      fontSize,
      fill: textColor,
      fontFamily: "'Plus Jakarta Sans', 'Pretendard Variable', sans-serif",
      fontWeight: isBold ? '700' : '400',
      fontStyle:  isItalic ? 'italic' : 'normal',
      backgroundColor: hasBg ? 'rgba(0,0,0,0.55)' : '',
      selectable: true,
      evented: true,
      editable: false,
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.requestRenderAll()
    textHistoryRef.current.push(text)
  }

  // ── 텍스트 입력 확인 ─────────────────────────────────────────────
  async function confirmText() {
    const val = textInputValue.trim()
    if (editingTextObj) {
      if (val) {
        editingTextObj.set({ text: val })
        fc.current?.renderAll()
      }
      setEditingTextObj(null)
    } else {
      await placeText(val)
    }
    setTextInputShown(false)
    setTextInputValue('')
  }

  function cancelTextInput() {
    setTextInputShown(false)
    setTextInputValue('')
    setEditingTextObj(null)
  }

  // ── 90° 회전 ───────────────────────────────────────────────────
  async function rotateImage() {
    const canvas = fc.current
    const img    = imgObj.current
    if (!canvas || !img) return

    const newAngle = ((img.angle || 0) + 90) % 360
    img.set({ angle: newAngle })
    img.setCoords?.()

    const dW = img.getScaledWidth()
    const dH = img.getScaledHeight()
    img.set({ left: (canvas.width - dW) / 2, top: (canvas.height - dH) / 2 })
    img.setCoords?.()

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
      const savedVpt = [...(canvas.viewportTransform || [1,0,0,1,0,0])]
      canvas.setViewportTransform([1,0,0,1,0,0])

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

      if (crop) crop.set({ visible: true })
      overlayRefs.current.forEach(r => r.set({ visible: mode === 'crop' }))
      canvas.setViewportTransform(savedVpt)
      canvas.requestRenderAll()

      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      onDone(blob)
    } catch (e) {
      console.error('[ImageEditor] export error:', e)
      if (cropObj.current) cropObj.current.set({ visible: true })
      fc.current?.requestRenderAll()
      setIsExporting(false)
    }
  }

  // ────────────────────────────────────────────────────────────────

  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700 }
  const iconBtn = (active: boolean): React.CSSProperties => ({
    ...btnBase,
    padding: '5px 10px', borderRadius: 8, fontSize: '0.75rem',
    background: active ? 'white' : 'rgba(255,255,255,0.14)',
    color: active ? '#18181b' : 'white',
  })

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" style={{ touchAction: 'none' }}>
      <style>{`@keyframes _spin { to { transform:rotate(360deg) } }`}</style>

      {/* ── 상단 바 ── */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={onCancel}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...btnBase }}
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
            ...btnBase, cursor: isExporting ? 'default' : 'pointer',
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
        {/* 선택된 텍스트 우측 상단 X 버튼 */}
        {deleteBtnPos && (
          <button
            onPointerDown={(e) => { e.stopPropagation(); deleteSelected() }}
            style={{
              position: 'absolute',
              left: deleteBtnPos.x - 12,
              top:  deleteBtnPos.y - 12,
              width: 24, height: 24,
              borderRadius: '50%',
              background: '#FF3B30',
              border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 20,
              boxShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            <X size={12} color="white" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* ── 크롭 옵션 ── */}
      {mode === 'crop' && (
        <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 shrink-0" style={{ background: 'rgba(10,10,10,0.9)' }}>
          {(['3:4', '1:1', 'free'] as const).map((a) => (
            <button
              key={a}
              onClick={() => changeAspect(a)}
              style={{ padding: '4px 14px', borderRadius: 999, fontSize: '0.75rem', ...iconBtn(aspect === a) }}
            >
              {a === 'free' ? '자유' : a}
            </button>
          ))}
        </div>
      )}

      {/* ── 텍스트 옵션 ── */}
      {mode === 'text' && (
        <div className="shrink-0 px-4 py-3 space-y-3" style={{ background: 'rgba(10,10,10,0.9)' }}>

          {/* 1행: 폰트 크기 슬라이더 */}
          <div className="flex items-center gap-3">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>크기</span>
            <input
              type="range" min={12} max={72} step={2}
              value={fontSize}
              onChange={(e) => {
                const s = Number(e.target.value)
                setFontSize(s)
                applyToSelected({ fontSize: s })
              }}
              style={{ flex: 1, accentColor: '#6366F1' }}
            />
            <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{fontSize}</span>
          </div>

          {/* 2행: 색상 + 배경 + 굵게 + 기울임 + 삭제 */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 텍스트 색상 */}
            {([['#ffffff', '흰색'], ['#000000', '검정'], ['#FFD600', '노랑'], ['#FF3B30', '빨강'], ['#34C759', '초록']] as const).map(([color, label]) => (
              <button
                key={color}
                title={label}
                onClick={() => {
                  setTextColor(color)
                  applyToSelected({ fill: color })
                }}
                style={{
                  width: 24, height: 24, borderRadius: '50%', ...btnBase,
                  background: color,
                  border: textColor === color ? '3px solid #6366F1' : '1.5px solid rgba(255,255,255,0.4)',
                }}
              />
            ))}

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />

            {/* 굵게 */}
            <button
              title="굵게"
              onClick={() => {
                const nb = !isBold
                setIsBold(nb)
                applyToSelected({ fontWeight: nb ? '700' : '400' })
              }}
              style={{ ...iconBtn(isBold), padding: '5px 8px' }}
            >
              <Bold size={13} />
            </button>

            {/* 기울임 */}
            <button
              title="기울임"
              onClick={() => {
                const ni = !isItalic
                setIsItalic(ni)
                applyToSelected({ fontStyle: ni ? 'italic' : 'normal' })
              }}
              style={{ ...iconBtn(isItalic), padding: '5px 8px' }}
            >
              <Italic size={13} />
            </button>

          </div>

          {/* 3행: 텍스트 추가 버튼 */}
          <button
            onClick={() => { setTextInputValue(''); setEditingTextObj(null); setTextInputShown(true) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0', borderRadius: 12,
              background: '#6366F1', color: 'white',
              fontSize: '0.85rem', ...btnBase,
            }}
          >
            <Plus size={16} /> 텍스트 추가
          </button>
        </div>
      )}

      {/* ── 하단 툴바 ── */}
      <div className="shrink-0" style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-around items-center px-4 pt-3 pb-2">
          {[
            { id: 'crop', label: '크롭',     Icon: Crop,     onClick: () => switchMode('crop') },
            { id: 'text', label: '텍스트',   Icon: Type,     onClick: () => switchMode('text') },
            { id: 'rot',  label: '회전',     Icon: RotateCw, onClick: rotateImage              },
            { id: 'undo', label: '실행취소', Icon: Undo2,    onClick: undoLastText             },
          ].map(({ id, label, Icon, onClick }) => {
            const active = (id === 'crop' && mode === 'crop') || (id === 'text' && mode === 'text')
            const disabled = id === 'undo' && textHistoryRef.current.length === 0
            return (
              <button
                key={id}
                onClick={onClick}
                disabled={disabled}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', ...btnBase, opacity: disabled ? 0.3 : 1 }}
              >
                <Icon size={22} color={active ? '#818CF8' : 'rgba(255,255,255,0.65)'} />
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: active ? '#818CF8' : 'rgba(255,255,255,0.45)' }}>{label}</span>
              </button>
            )
          })}
        </div>
        {/* 완료 버튼 */}
        <div style={{ padding: '8px 16px 20px' }}>
          <button
            onClick={handleDone}
            disabled={isExporting}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 0', borderRadius: 14,
              background: isExporting ? 'rgba(99,102,241,0.6)' : '#6366F1',
              ...btnBase, cursor: isExporting ? 'default' : 'pointer',
            }}
          >
            {isExporting
              ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: '_spin 0.7s linear infinite' }} />
              : <Check size={17} color="white" />
            }
            <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
              {isExporting ? '처리 중...' : '완료'}
            </span>
          </button>
        </div>
      </div>

      {/* ── 텍스트 입력/편집 오버레이 ── */}
      {textInputShown && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end' }}
          onClick={cancelTextInput}
        >
          <div
            style={{ width: '100%', background: '#1c1c1e', borderRadius: '18px 18px 0 0', padding: '20px 16px 32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>
              {editingTextObj ? '텍스트 편집' : '텍스트 입력'}
            </p>
            <textarea
              autoFocus
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder="입력할 텍스트를 작성하세요"
              rows={3}
              style={{
                width: '100%', background: '#2c2c2e', color: 'white',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                padding: '12px 14px', fontSize: '1rem', resize: 'none',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={cancelTextInput}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: 'white', ...btnBase, fontSize: '0.9rem' }}
              >
                취소
              </button>
              <button
                onClick={confirmText}
                style={{ flex: 2, padding: '13px 0', borderRadius: 12, background: '#6366F1', color: 'white', ...btnBase, fontSize: '0.9rem' }}
              >
                {editingTextObj ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
