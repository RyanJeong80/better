'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, Check, Crop, Type, SlidersHorizontal, Plus, Bold, Italic,
  Undo2, Redo2, RefreshCw, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react'

type Mode = 'crop' | 'text' | 'adjust'
type AspectKey = '3:4' | '1:1' | 'free'
type FilterName = 'original' | 'grayscale' | 'sepia' | 'sharpen' | 'brighten' | 'darken' | 'warm' | 'cool'

interface SerializedText {
  _id: string
  text: string
  left: number
  top: number
  fontSize: number
  fill: string
  fontWeight: string
  fontStyle: string
  backgroundColor: string
  textAlign: string
  hasShadow: boolean
  scaleX: number
  scaleY: number
  angle: number
}

interface HistoryEntry {
  texts: SerializedText[]
  filter: FilterName
  brightness: number
  contrast: number
}

interface Props {
  file: File
  onDone: (blob: Blob) => void
  onCancel: () => void
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const WARM_MATRIX = [1.2, 0.05, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 1, 0]
const COOL_MATRIX = [0.85, 0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0.05, 1.2, 0, 0, 0, 0, 0, 1, 0]

const FILTER_LIST: { name: FilterName; label: string; css: string }[] = [
  { name: 'original',  label: '원본',    css: 'none' },
  { name: 'grayscale', label: '흑백',    css: 'grayscale(100%)' },
  { name: 'sepia',     label: '빈티지',  css: 'sepia(100%)' },
  { name: 'sharpen',   label: '선명',    css: 'contrast(1.15) saturate(1.1)' },
  { name: 'brighten',  label: '밝게',    css: 'brightness(1.3)' },
  { name: 'darken',    label: '어둡게',  css: 'brightness(0.7)' },
  { name: 'warm',      label: '따뜻',    css: 'sepia(35%) saturate(1.4) hue-rotate(-10deg)' },
  { name: 'cool',      label: '차갑게',  css: 'saturate(0.85) hue-rotate(20deg)' },
]

// ─── fabric 캐싱 ──────────────────────────────────────────────────────────────

let fabricModuleCache: any = null
async function getFabric() {
  if (!fabricModuleCache) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    fabricModuleCache = await import(/* webpackIgnore: true */ '/vendor/fabric.mjs')
  }
  return fabricModuleCache
}

// ─── 크롭 오버레이 ────────────────────────────────────────────────────────────

function updateOverlay(canvas: any, crop: any, overlays: any[]) {
  const W = canvas.width as number
  const H = canvas.height as number
  const cL = crop.left as number
  const cT = crop.top as number
  const cW = crop.getScaledWidth() as number
  const cH = crop.getScaledHeight() as number
  const [top, bottom, left, right] = overlays
  top.set    ({ left: 0,      top: 0,       width: W,           height: cT          })
  bottom.set ({ left: 0,      top: cT + cH, width: W,           height: H - cT - cH })
  left.set   ({ left: 0,      top: cT,      width: cL,          height: cH          })
  right.set  ({ left: cL + cW, top: cT,    width: W - cL - cW, height: cH          })
  canvas.requestRenderAll()
}

// ─── 텍스트 직렬화 ────────────────────────────────────────────────────────────

function serializeTextObj(obj: any): SerializedText {
  if (!obj._id) obj._id = Math.random().toString(36).slice(2)
  return {
    _id: obj._id,
    text: obj.text || '',
    left: obj.left as number,
    top: obj.top as number,
    fontSize: Number(obj.fontSize) || 36,
    fill: (obj.fill as string) || '#ffffff',
    fontWeight: (obj.fontWeight as string) || '400',
    fontStyle: (obj.fontStyle as string) || 'normal',
    backgroundColor: (obj.backgroundColor as string) || '',
    textAlign: (obj.textAlign as string) || 'center',
    hasShadow: !!(obj.shadow),
    scaleX: (obj.scaleX as number) || 1,
    scaleY: (obj.scaleY as number) || 1,
    angle: (obj.angle as number) || 0,
  }
}

// ─── ToolButton 컴포넌트 ──────────────────────────────────────────────────────

function ToolButton({ icon, label, active, disabled, onClick }: {
  icon: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
        fontWeight: 700, opacity: disabled ? 0.3 : 1, minWidth: 44, padding: 0,
      }}
    >
      {icon}
      <span style={{ fontSize: '0.6rem', fontWeight: 600, color: active ? '#818CF8' : 'rgba(255,255,255,0.45)' }}>
        {label}
      </span>
    </button>
  )
}

// ─── ImageEditor ──────────────────────────────────────────────────────────────

export function ImageEditor({ file, onDone, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const fc           = useRef<any>(null)
  const imgObj       = useRef<any>(null)
  const cropObj      = useRef<any>(null)
  const overlayRefs  = useRef<any[]>([])

  // history refs
  const historyStack = useRef<HistoryEntry[]>([])
  const historyIndex = useRef<number>(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // current state refs (for async callbacks)
  const filterRef     = useRef<FilterName>('original')
  const brightnessRef = useRef<number>(0)
  const contrastRef   = useRef<number>(0)

  const [mode, setMode]       = useState<Mode>('crop')
  const [aspect, setAspect]   = useState<AspectKey>('3:4')
  const aspectRef             = useRef<AspectKey>('3:4')
  aspectRef.current = aspect

  // text panel state
  const [fontSize,    setFontSize]    = useState(36)
  const [textColor,   setTextColor]   = useState('#ffffff')
  const [isBold,      setIsBold]      = useState(false)
  const [isItalic,    setIsItalic]    = useState(false)
  const [textAlign,   setTextAlign]   = useState<'left' | 'center' | 'right'>('center')
  const [hasShadow,   setHasShadow]   = useState(false)
  const [textItems,   setTextItems]   = useState<SerializedText[]>([])
  const [selTextId,   setSelTextId]   = useState<string | null>(null)
  const [selTextObj,  setSelTextObj]  = useState<any>(null)
  const [deleteBtnPos, setDeleteBtnPos] = useState<{ x: number; y: number } | null>(null)

  // adjust panel state
  const [activeFilter, setActiveFilter] = useState<FilterName>('original')
  const [brightness,   setBrightness]   = useState(0)
  const [contrast,     setContrast]     = useState(0)

  // text input overlay
  const [textInputShown,  setTextInputShown]  = useState(false)
  const [textInputValue,  setTextInputValue]  = useState('')
  const [editingTextObj,  setEditingTextObj]  = useState<any>(null)

  const [thumbUrl,     setThumbUrl]     = useState<string | null>(null)
  const [isExporting,  setIsExporting]  = useState(false)

  // ── Thumbnail URL ──────────────────────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // ── fabric 필터 적용 ──────────────────────────────────────────────────────
  const applyAllFilters = useCallback(async (
    img: any, filter: FilterName, bright: number, contr: number, canvas: any,
  ) => {
    const fm = await getFabric()
    const F  = fm.filters || {}
    const result: any[] = []

    if      (filter === 'grayscale' && F.Grayscale)  result.push(new F.Grayscale())
    else if (filter === 'sepia'     && F.Sepia)       result.push(new F.Sepia())
    else if (filter === 'sharpen'   && F.Convolute)   result.push(new F.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }))
    else if (filter === 'brighten'  && F.Brightness)  result.push(new F.Brightness({ brightness: 0.3 }))
    else if (filter === 'darken'    && F.Brightness)  result.push(new F.Brightness({ brightness: -0.3 }))
    else if (filter === 'warm'      && F.ColorMatrix) result.push(new F.ColorMatrix({ matrix: WARM_MATRIX }))
    else if (filter === 'cool'      && F.ColorMatrix) result.push(new F.ColorMatrix({ matrix: COOL_MATRIX }))

    if (bright !== 0 && F.Brightness) result.push(new F.Brightness({ brightness: bright / 100 }))
    if (contr  !== 0 && F.Contrast)   result.push(new F.Contrast  ({ contrast:   contr  / 100 }))

    img.filters = result
    img.applyFilters()
    canvas.requestRenderAll()
  }, [])

  // ── history helpers ────────────────────────────────────────────────────────
  function getCanvasTexts(): SerializedText[] {
    const canvas = fc.current
    if (!canvas) return []
    return (canvas.getObjects() as any[])
      .filter((o: any) => o.type === 'i-text')
      .map(serializeTextObj)
  }

  function pushHistory() {
    const entry: HistoryEntry = {
      texts:      getCanvasTexts(),
      filter:     filterRef.current,
      brightness: brightnessRef.current,
      contrast:   contrastRef.current,
    }
    historyStack.current = historyStack.current.slice(0, historyIndex.current + 1)
    historyStack.current.push(entry)
    if (historyStack.current.length > 20) historyStack.current.shift()
    historyIndex.current = historyStack.current.length - 1
    setCanUndo(historyIndex.current > 0)
    setCanRedo(false)
  }

  async function restoreFromHistory(entry: HistoryEntry) {
    const canvas = fc.current
    const img    = imgObj.current
    if (!canvas || !img) return

    // 텍스트 초기화
    ;(canvas.getObjects() as any[])
      .filter((o: any) => o.type === 'i-text')
      .forEach((o: any) => canvas.remove(o))
    canvas.discardActiveObject()
    setSelTextObj(null); setSelTextId(null); setDeleteBtnPos(null)

    const fm = await getFabric()
    const { IText, Shadow } = fm
    const newItems: SerializedText[] = []

    for (const t of entry.texts) {
      const shadow = t.hasShadow
        ? new Shadow({ color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 2, offsetY: 2 })
        : undefined
      const obj = new IText(t.text, {
        left: t.left, top: t.top,
        originX: 'left', originY: 'top',
        fontSize: t.fontSize, fill: t.fill,
        fontFamily: "'Plus Jakarta Sans', 'Pretendard Variable', sans-serif",
        fontWeight: t.fontWeight, fontStyle: t.fontStyle,
        backgroundColor: t.backgroundColor, textAlign: t.textAlign,
        shadow, scaleX: t.scaleX, scaleY: t.scaleY, angle: t.angle,
        selectable: true, evented: true, editable: false,
      })
      obj._id = t._id
      canvas.add(obj)
      newItems.push(serializeTextObj(obj))
    }
    setTextItems(newItems)

    filterRef.current     = entry.filter
    brightnessRef.current = entry.brightness
    contrastRef.current   = entry.contrast
    setActiveFilter(entry.filter)
    setBrightness(entry.brightness)
    setContrast(entry.contrast)
    await applyAllFilters(img, entry.filter, entry.brightness, entry.contrast, canvas)
    canvas.requestRenderAll()
  }

  const undoHistory = useCallback(async () => {
    if (historyIndex.current <= 0) return
    historyIndex.current -= 1
    await restoreFromHistory(historyStack.current[historyIndex.current])
    setCanUndo(historyIndex.current > 0)
    setCanRedo(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyAllFilters])

  const redoHistory = useCallback(async () => {
    if (historyIndex.current >= historyStack.current.length - 1) return
    historyIndex.current += 1
    await restoreFromHistory(historyStack.current[historyIndex.current])
    setCanUndo(true)
    setCanRedo(historyIndex.current < historyStack.current.length - 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyAllFilters])

  // ── buildCropRect ──────────────────────────────────────────────────────────
  function buildCropRect(fm: any, canvas: any, img: any, asp: AspectKey) {
    const { Rect } = fm
    const dW = img.getScaledWidth() as number
    const dH = img.getScaledHeight() as number
    const iL = img.left as number
    const iT = img.top  as number
    const baseW = 300
    const baseH = asp === '3:4' ? 400 : asp === '1:1' ? 300 : 250
    const maxS  = Math.min((dW * 0.88) / baseW, (dH * 0.88) / baseH)
    return new Rect({
      left: iL + (dW - baseW * maxS) / 2,
      top:  iT + (dH - baseH * maxS) / 2,
      width: baseW, height: baseH,
      scaleX: maxS, scaleY: maxS,
      fill: 'transparent',
      stroke: '#ffffff', strokeWidth: 2 / maxS,
      strokeDashArray: [8 / maxS, 5 / maxS],
      cornerColor: '#ffffff', cornerStrokeColor: '#4a4a4a', cornerSize: 14,
      transparentCorners: false,
      selectable: true, lockRotation: true,
      lockUniScaling: asp !== 'free',
      originX: 'left', originY: 'top',
    })
  }

  // ── Canvas 초기화 ──────────────────────────────────────────────────────────
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
        left: (W - iW * scale) / 2, top: (H - iH * scale) / 2,
        scaleX: scale, scaleY: scale,
        selectable: false, evented: false,
        originX: 'left', originY: 'top',
      })
      fabricCanvas.add(img)
      imgObj.current = img

      const overlayStyle = { fill: 'rgba(0,0,0,0.52)', selectable: false, evented: false, originX: 'left' as const, originY: 'top' as const }
      const overlays = [new Rect(overlayStyle), new Rect(overlayStyle), new Rect(overlayStyle), new Rect(overlayStyle)]
      overlays.forEach(r => fabricCanvas.add(r))
      overlayRefs.current = overlays

      const cropRect = buildCropRect(fm, fabricCanvas, img, '3:4')
      fabricCanvas.add(cropRect)
      fabricCanvas.setActiveObject(cropRect)
      cropObj.current = cropRect

      const refreshOverlay = () => updateOverlay(fabricCanvas, cropRect, overlays)
      cropRect.on('moving', refreshOverlay)
      cropRect.on('scaling', refreshOverlay)
      updateOverlay(fabricCanvas, cropRect, overlays)

      // ── 텍스트 선택 동기화 ───────────────────────────────────────────────
      const calcDelPos = (obj: any) => {
        const r = obj.getBoundingRect()
        setDeleteBtnPos({ x: r.left + r.width, y: r.top })
      }
      const syncSel = (obj: any) => {
        if (obj?.type === 'i-text') {
          setSelTextObj(obj)
          setSelTextId(obj._id || null)
          setFontSize(Number(obj.fontSize) || 36)
          setTextColor((obj.fill as string) || '#ffffff')
          setIsBold(obj.fontWeight === '700' || obj.fontWeight === 'bold')
          setIsItalic(obj.fontStyle === 'italic')
          setTextAlign((obj.textAlign as 'left' | 'center' | 'right') || 'center')
          setHasShadow(!!obj.shadow)
          calcDelPos(obj)
        } else {
          setSelTextObj(null); setSelTextId(null); setDeleteBtnPos(null)
        }
      }
      fabricCanvas.on('selection:created',  (e: any) => syncSel(e.selected?.[0]))
      fabricCanvas.on('selection:updated',  (e: any) => syncSel(e.selected?.[0]))
      fabricCanvas.on('selection:cleared',  () => { setSelTextObj(null); setSelTextId(null); setDeleteBtnPos(null) })
      fabricCanvas.on('object:moving',      (e: any) => { if (e.target?.type === 'i-text') calcDelPos(e.target) })
      fabricCanvas.on('object:scaling',     (e: any) => { if (e.target?.type === 'i-text') calcDelPos(e.target) })
      fabricCanvas.on('object:modified',    (e: any) => {
        if (e.target?.type === 'i-text') {
          const id = e.target._id
          setTextItems(prev => prev.map(t => t._id === id ? serializeTextObj(e.target) : t))
          pushHistory()
        }
      })
      fabricCanvas.on('mouse:dblclick', (e: any) => {
        const obj = e.target
        if (obj?.type === 'i-text') {
          setEditingTextObj(obj)
          setTextInputValue(obj.text || '')
          setTextInputShown(true)
        }
      })

      // 초기 히스토리
      historyStack.current = [{ texts: [], filter: 'original', brightness: 0, contrast: 0 }]
      historyIndex.current = 0
      setCanUndo(false); setCanRedo(false)

      fabricCanvas.requestRenderAll()
    })()

    return () => {
      destroyed = true
      try { fabricCanvas?.dispose() } catch {}
      fc.current = null; imgObj.current = null; cropObj.current = null
      overlayRefs.current = []
      historyStack.current = []; historyIndex.current = -1
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // ── 키보드 단축키 ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (textInputShown) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const obj = fc.current?.getActiveObject()
        if (obj?.type === 'i-text') { e.preventDefault(); removeTextObj(obj) }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redoHistory(); else undoHistory()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textInputShown, undoHistory, redoHistory])

  // ── 핀치 줌 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let lastDist = 0
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2)
        lastDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !fc.current) return
      e.preventDefault()
      const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
      if (!lastDist) { lastDist = dist; return }
      let zoom = Math.max(0.5, Math.min(6, fc.current.getZoom() * (dist / lastDist)))
      const rect = container.getBoundingClientRect()
      fc.current.zoomToPoint({
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      }, zoom)
      lastDist = dist
    }
    container.addEventListener('touchstart', onStart, { passive: true })
    container.addEventListener('touchmove',  onMove,  { passive: false })
    return () => {
      container.removeEventListener('touchstart', onStart)
      container.removeEventListener('touchmove',  onMove)
    }
  }, [])

  // ── 텍스트 제거 ───────────────────────────────────────────────────────────
  function removeTextObj(obj: any) {
    const canvas = fc.current
    if (!canvas) return
    canvas.remove(obj)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    setSelTextObj(null); setSelTextId(null); setDeleteBtnPos(null)
    setTextItems(prev => prev.filter(t => t._id !== obj._id))
    pushHistory()
  }

  function deleteSelected() {
    const obj = fc.current?.getActiveObject()
    if (obj?.type === 'i-text') removeTextObj(obj)
  }

  // ── 선택 텍스트에 스타일 적용 ──────────────────────────────────────────────
  const applyToSelected = useCallback((patch: Record<string, any>) => {
    const canvas = fc.current
    const obj    = canvas?.getActiveObject()
    if (obj?.type === 'i-text') {
      obj.set(patch)
      canvas.renderAll()
      const id = obj._id
      setTextItems(prev => prev.map(t => t._id === id ? serializeTextObj(obj) : t))
    }
  }, [])

  // ── 비율 변경 ─────────────────────────────────────────────────────────────
  const changeAspect = useCallback(async (newAsp: AspectKey) => {
    setAspect(newAsp)
    const canvas = fc.current; const img = imgObj.current; const old = cropObj.current
    if (!canvas || !img) return
    const fm = await getFabric()
    if (old) { canvas.remove(old); cropObj.current = null }
    const cropRect = buildCropRect(fm, canvas, img, newAsp)
    canvas.add(cropRect); canvas.setActiveObject(cropRect); cropObj.current = cropRect
    const refresh = () => updateOverlay(canvas, cropRect, overlayRefs.current)
    cropRect.on('moving', refresh); cropRect.on('scaling', refresh)
    updateOverlay(canvas, cropRect, overlayRefs.current)
    canvas.requestRenderAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 모드 전환 ─────────────────────────────────────────────────────────────
  function switchMode(newMode: Mode) {
    setMode(newMode)
    const canvas = fc.current; const crop = cropObj.current
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

  // ── 텍스트 배치 ───────────────────────────────────────────────────────────
  async function placeText(value: string) {
    const fm = await getFabric()
    const { IText, Shadow } = fm
    const canvas = fc.current
    if (!canvas || !value.trim()) return
    const shadow = hasShadow ? new Shadow({ color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 2, offsetY: 2 }) : undefined
    const obj = new IText(value.trim(), {
      left: canvas.width / 2, top: canvas.height / 2,
      originX: 'center', originY: 'center',
      fontSize, fill: textColor,
      fontFamily: "'Plus Jakarta Sans', 'Pretendard Variable', sans-serif",
      fontWeight: isBold ? '700' : '400',
      fontStyle: isItalic ? 'italic' : 'normal',
      backgroundColor: '', textAlign,
      shadow, selectable: true, evented: true, editable: false,
    })
    obj._id = Math.random().toString(36).slice(2)
    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.requestRenderAll()
    setTextItems(prev => [...prev, serializeTextObj(obj)])
    pushHistory()
  }

  // ── 텍스트 입력 확인 ──────────────────────────────────────────────────────
  async function confirmText() {
    const val = textInputValue.trim()
    if (editingTextObj) {
      if (val) {
        editingTextObj.set({ text: val })
        fc.current?.renderAll()
        const id = editingTextObj._id
        setTextItems(prev => prev.map(t => t._id === id ? serializeTextObj(editingTextObj) : t))
        pushHistory()
      }
      setEditingTextObj(null)
    } else {
      await placeText(val)
    }
    setTextInputShown(false); setTextInputValue('')
  }

  function cancelTextInput() {
    setTextInputShown(false); setTextInputValue(''); setEditingTextObj(null)
  }

  // ── 필터 변경 ─────────────────────────────────────────────────────────────
  async function handleFilterChange(filter: FilterName) {
    setActiveFilter(filter); filterRef.current = filter
    const img = imgObj.current; const canvas = fc.current
    if (!img || !canvas) return
    await applyAllFilters(img, filter, brightnessRef.current, contrastRef.current, canvas)
    pushHistory()
  }

  // ── 밝기/대비 변경 ────────────────────────────────────────────────────────
  async function handleBrightnessChange(val: number) {
    setBrightness(val); brightnessRef.current = val
    const img = imgObj.current; const canvas = fc.current
    if (!img || !canvas) return
    await applyAllFilters(img, filterRef.current, val, contrastRef.current, canvas)
  }

  async function handleContrastChange(val: number) {
    setContrast(val); contrastRef.current = val
    const img = imgObj.current; const canvas = fc.current
    if (!img || !canvas) return
    await applyAllFilters(img, filterRef.current, brightnessRef.current, val, canvas)
  }

  // ── 초기화 ────────────────────────────────────────────────────────────────
  async function handleReset() {
    const canvas = fc.current; const img = imgObj.current
    if (!canvas || !img) return
    ;(canvas.getObjects() as any[])
      .filter((o: any) => o.type === 'i-text')
      .forEach((o: any) => canvas.remove(o))
    canvas.discardActiveObject()
    setTextItems([]); setSelTextObj(null); setSelTextId(null); setDeleteBtnPos(null)
    img.filters = []; img.applyFilters()
    filterRef.current = 'original'; brightnessRef.current = 0; contrastRef.current = 0
    setActiveFilter('original'); setBrightness(0); setContrast(0)
    historyStack.current = [{ texts: [], filter: 'original', brightness: 0, contrast: 0 }]
    historyIndex.current = 0; setCanUndo(false); setCanRedo(false)
    canvas.requestRenderAll()
  }

  // ── 완료: 크롭 후 blob ────────────────────────────────────────────────────
  async function handleDone() {
    const canvas = fc.current; const crop = cropObj.current
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

      const blob = await (await fetch(dataUrl)).blob()
      onDone(blob)
    } catch (e) {
      console.error('[ImageEditor] export error:', e)
      cropObj.current?.set({ visible: true })
      fc.current?.requestRenderAll()
      setIsExporting(false)
    }
  }

  // ── 스타일 상수 ───────────────────────────────────────────────────────────
  const B: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700 }
  const iconBtn = (active: boolean): React.CSSProperties => ({
    ...B, padding: '4px 7px', borderRadius: 7,
    background: active ? 'white' : 'rgba(255,255,255,0.14)',
    color: active ? '#18181b' : 'white',
  })

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" style={{ touchAction: 'none' }}>
      <style>{`
        @keyframes _spin { to { transform:rotate(360deg) } }
        .filter-scroll::-webkit-scrollbar { display: none }
      `}</style>

      {/* ── 상단 바 ── */}
      <div className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={onCancel}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', ...B }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" />
          </svg>
          <span style={{ color: 'white', fontSize: '0.85rem' }}>취소</span>
        </button>

        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>사진 편집</span>

        <button onClick={handleDone} disabled={isExporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 14px', height: 34, borderRadius: 999,
            background: isExporting ? 'rgba(99,102,241,0.6)' : '#6366F1',
            ...B, cursor: isExporting ? 'default' : 'pointer',
          }}>
          {isExporting
            ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: '_spin 0.7s linear infinite' }} />
            : <Check size={14} color="white" />}
          <span style={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>완료</span>
        </button>
      </div>

      {/* ── 캔버스 ── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: '#111' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        {deleteBtnPos && (
          <button
            onPointerDown={(e) => { e.stopPropagation(); deleteSelected() }}
            style={{
              position: 'absolute',
              left: deleteBtnPos.x - 12, top: deleteBtnPos.y - 12,
              width: 24, height: 24, borderRadius: '50%',
              background: '#FF3B30', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 20,
              boxShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}>
            <X size={12} color="white" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* ── 필터 바 ── */}
      <div style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 0' }}>
        <div className="filter-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px', scrollbarWidth: 'none' }}>
          {FILTER_LIST.map(({ name, label, css }) => (
            <button key={name} onClick={() => handleFilterChange(name)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, background: 'none', ...B }}>
              <div style={{
                width: 56, height: 56, borderRadius: 9, overflow: 'hidden',
                border: activeFilter === name ? '2.5px solid #6366F1' : '2px solid rgba(255,255,255,0.1)',
                transition: 'border-color 0.15s',
              }}>
                {thumbUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={thumbUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: css }} />
                  : <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }} />}
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 600, color: activeFilter === name ? '#818CF8' : 'rgba(255,255,255,0.45)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 크롭 옵션 ── */}
      {mode === 'crop' && (
        <div className="flex items-center justify-center gap-2.5 px-4 shrink-0"
          style={{ height: 46, background: 'rgba(10,10,10,0.95)' }}>
          {(['3:4', '1:1', 'free'] as const).map((a) => (
            <button key={a} onClick={() => changeAspect(a)}
              style={{ padding: '4px 14px', borderRadius: 999, fontSize: '0.75rem', ...iconBtn(aspect === a) }}>
              {a === 'free' ? '자유' : a}
            </button>
          ))}
        </div>
      )}

      {/* ── 텍스트 옵션 ── */}
      {mode === 'text' && (
        <div className="shrink-0 px-4 py-2.5 space-y-2" style={{ background: 'rgba(10,10,10,0.95)' }}>
          {/* 텍스트 목록 */}
          {textItems.length > 0 && (
            <div className="filter-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {textItems.map((t) => (
                <button key={t._id}
                  onClick={() => {
                    const canvas = fc.current; if (!canvas) return
                    const obj = (canvas.getObjects() as any[]).find((o: any) => o._id === t._id)
                    if (obj) { canvas.setActiveObject(obj); canvas.requestRenderAll() }
                  }}
                  style={{
                    flexShrink: 0, padding: '3px 10px', borderRadius: 20,
                    background: selTextId === t._id ? '#6366F1' : 'rgba(255,255,255,0.12)',
                    color: 'white', fontSize: '0.7rem', fontWeight: 600,
                    maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    ...B,
                  }}>
                  {t.text}
                </button>
              ))}
            </div>
          )}

          {/* 폰트 크기 슬라이더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>크기</span>
            <input type="range" min={12} max={72} step={2} value={fontSize}
              onChange={(e) => { const s = Number(e.target.value); setFontSize(s); applyToSelected({ fontSize: s }) }}
              style={{ flex: 1, accentColor: '#6366F1' }} />
            <span style={{ color: 'white', fontSize: '0.72rem', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{fontSize}</span>
          </div>

          {/* 색상 + 스타일 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {(['#ffffff', '#000000', '#FFD600', '#FF3B30', '#34C759'] as const).map((c) => (
              <button key={c} onClick={() => { setTextColor(c); applyToSelected({ fill: c }) }}
                style={{ width: 22, height: 22, borderRadius: '50%', ...B, background: c, border: textColor === c ? '3px solid #6366F1' : '1.5px solid rgba(255,255,255,0.35)' }} />
            ))}
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 1px' }} />
            <button onClick={() => { const nb = !isBold; setIsBold(nb); applyToSelected({ fontWeight: nb ? '700' : '400' }) }}
              style={iconBtn(isBold)}><Bold size={13} /></button>
            <button onClick={() => { const ni = !isItalic; setIsItalic(ni); applyToSelected({ fontStyle: ni ? 'italic' : 'normal' }) }}
              style={iconBtn(isItalic)}><Italic size={13} /></button>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 1px' }} />
            {(['left', 'center', 'right'] as const).map((a) => {
              const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
              return (
                <button key={a} onClick={() => { setTextAlign(a); applyToSelected({ textAlign: a }) }}
                  style={iconBtn(textAlign === a)}><Icon size={13} /></button>
              )
            })}
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 1px' }} />
            <button
              onClick={async () => {
                const ns = !hasShadow; setHasShadow(ns)
                const canvas = fc.current; const obj = canvas?.getActiveObject()
                if (obj?.type === 'i-text') {
                  if (ns) {
                    const { Shadow } = await getFabric()
                    obj.set({ shadow: new Shadow({ color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 2, offsetY: 2 }) })
                  } else { obj.set({ shadow: null }) }
                  canvas.renderAll()
                  const id = obj._id
                  setTextItems(prev => prev.map(t => t._id === id ? serializeTextObj(obj) : t))
                }
              }}
              style={{ ...iconBtn(hasShadow), fontSize: '0.65rem', padding: '4px 8px' }}>
              그림자
            </button>
          </div>

          {/* 텍스트 추가 버튼 */}
          <button onClick={() => { setTextInputValue(''); setEditingTextObj(null); setTextInputShown(true) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 10, background: '#6366F1', color: 'white', fontSize: '0.83rem', ...B,
            }}>
            <Plus size={15} /> 텍스트 추가
          </button>
        </div>
      )}

      {/* ── 밝기/대비 옵션 ── */}
      {mode === 'adjust' && (
        <div className="shrink-0 px-4 py-3 space-y-3" style={{ background: 'rgba(10,10,10,0.95)' }}>
          {[
            { label: '밝기', val: brightness, onChange: handleBrightnessChange },
            { label: '대비', val: contrast,   onChange: handleContrastChange   },
          ].map(({ label, val, onChange }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', whiteSpace: 'nowrap', minWidth: 26 }}>{label}</span>
              <input type="range" min={-100} max={100} step={5} value={val}
                onChange={(e) => onChange(Number(e.target.value))}
                onPointerUp={() => pushHistory()}
                style={{ flex: 1, accentColor: '#6366F1' }} />
              <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700, minWidth: 34, textAlign: 'right' }}>
                {val > 0 ? `+${val}` : val}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 하단 툴바 ── */}
      <div className="shrink-0 flex items-center justify-around px-2 py-3"
        style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <ToolButton icon={<Crop size={21} color={mode === 'crop' ? '#818CF8' : 'rgba(255,255,255,0.65)'} />}
          label="크롭" active={mode === 'crop'} onClick={() => switchMode('crop')} />
        <ToolButton icon={<Type size={21} color={mode === 'text' ? '#818CF8' : 'rgba(255,255,255,0.65)'} />}
          label="텍스트" active={mode === 'text'} onClick={() => switchMode('text')} />
        <ToolButton icon={<SlidersHorizontal size={21} color={mode === 'adjust' ? '#818CF8' : 'rgba(255,255,255,0.65)'} />}
          label="밝기" active={mode === 'adjust'} onClick={() => switchMode('adjust')} />
        <ToolButton icon={<Undo2 size={21} color={canUndo ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)'} />}
          label="취소" disabled={!canUndo} onClick={undoHistory} />
        <ToolButton icon={<Redo2 size={21} color={canRedo ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)'} />}
          label="다시" disabled={!canRedo} onClick={redoHistory} />
        <ToolButton icon={<RefreshCw size={21} color="rgba(255,255,255,0.65)" />}
          label="초기화" onClick={handleReset} />
      </div>

      {/* ── 텍스트 입력 오버레이 ── */}
      {textInputShown && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end' }}
          onClick={cancelTextInput}>
          <div style={{ width: '100%', background: '#1c1c1e', borderRadius: '18px 18px 0 0', padding: '20px 16px 32px' }}
            onClick={(e) => e.stopPropagation()}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>
              {editingTextObj ? '텍스트 편집' : '텍스트 입력'}
            </p>
            <textarea autoFocus value={textInputValue} onChange={(e) => setTextInputValue(e.target.value)}
              placeholder="입력할 텍스트를 작성하세요" rows={3}
              style={{ width: '100%', background: '#2c2c2e', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 14px', fontSize: '1rem', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={cancelTextInput}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                취소
              </button>
              <button onClick={confirmText}
                style={{ flex: 2, padding: '13px 0', borderRadius: 12, background: '#6366F1', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                {editingTextObj ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
