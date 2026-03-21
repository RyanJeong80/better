'use client'

import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveBattle } from '@/actions/battles'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'
import { ImageEditor } from '@/components/battles/image-editor'

const MAX_DESC = 100
const MAX_FILE_MB = 5
const MAX_IMAGE_PX = 1280
const JPEG_QUALITY = 0.82
const TEXT_IMAGE_SIZE = 800

const TEXT_BG_COLORS = [
  { bg: '#18181b', text: '#ffffff' },
  { bg: '#7c3aed', text: '#ffffff' },
  { bg: '#db2777', text: '#ffffff' },
  { bg: '#0891b2', text: '#ffffff' },
  { bg: '#f8fafc', text: '#18181b' },
]

// ─── 이미지 리사이징 ──────────────────────────────────────────────
async function resizeImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file

  return new Promise((resolve) => {
    const img = new Image()
    const tempUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(tempUrl)
      const { naturalWidth: w, naturalHeight: h } = img

      if (w <= MAX_IMAGE_PX && h <= MAX_IMAGE_PX) { resolve(file); return }

      const ratio = Math.min(MAX_IMAGE_PX / w, MAX_IMAGE_PX / h)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          canvas.width = 0; canvas.height = 0
          resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file)
        },
        'image/jpeg', JPEG_QUALITY,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(tempUrl); resolve(file) }
    img.src = tempUrl
  })
}

// ─── 텍스트 줄바꿈 ────────────────────────────────────────────────
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (!word) continue
    if (ctx.measureText(word).width > maxWidth) {
      if (current) { lines.push(current); current = '' }
      for (const char of word) {
        const t = current + char
        if (ctx.measureText(t).width > maxWidth && current) { lines.push(current); current = char }
        else current = t
      }
    } else {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word }
      else current = test
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [text]
}

// ─── 텍스트 → 이미지 변환 ─────────────────────────────────────────
async function generateTextImage(text: string, colorIdx: number): Promise<File> {
  const { bg, text: textColor } = TEXT_BG_COLORS[colorIdx]
  const SIZE = TEXT_IMAGE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = SIZE; canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  const PADDING = 60
  const maxWidth = SIZE - PADDING * 2

  let lo = 20, hi = 260
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `700 ${mid}px 'Plus Jakarta Sans', 'Pretendard Variable', sans-serif`
    if (wrapText(ctx, text, maxWidth).length * mid * 1.3 <= SIZE - PADDING * 2) lo = mid
    else hi = mid
  }
  const fontSize = lo

  ctx.font = `700 ${fontSize}px 'Plus Jakarta Sans', 'Pretendard Variable', sans-serif`
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  const lines = wrapText(ctx, text, maxWidth)
  const lineHeight = fontSize * 1.3
  const startY = (SIZE - lines.length * lineHeight) / 2 + fontSize

  lines.forEach((line, i) => ctx.fillText(line, SIZE / 2, startY + i * lineHeight))

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = 0; canvas.height = 0
      if (!blob) { reject(new Error('텍스트 이미지 생성 실패')); return }
      resolve(new File([blob], `text-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  })
}

// ─── 텍스트 이미지 Supabase 업로드 ───────────────────────────────
async function uploadTextImage(text: string, colorIdx: number, side: 'A' | 'B'): Promise<string> {
  const file = await generateTextImage(text, colorIdx)
  const supabase = createClient()
  const path = `${Date.now()}-${side}-text.jpg`

  const { data, error } = await supabase.storage
    .from('battle-images')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage.from('battle-images').getPublicUrl(data.path)
  return publicUrl
}

// ─── 이미지 슬롯 ──────────────────────────────────────────────────
interface SlotState {
  preview: string | null
  url: string | null
  uploading: boolean
  uploadError: string | null
  desc: string
  selectedColor: number
}

interface SlotHandle {
  upload: (file: File) => void
}

const ImageSlot = memo(forwardRef<SlotHandle, {
  side: 'A' | 'B'
  state: SlotState
  onChange: (patch: Partial<SlotState>) => void
  onEditFile?: (file: File) => void
}>(function ImageSlot({ side, state, onChange, onEditFile }, ref) {
  const hasImage = !!state.preview || state.uploading
  const nearLimit = state.desc.length >= 80
  const atLimit = state.desc.length >= MAX_DESC

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      onChange({ uploadError: `파일 크기는 ${MAX_FILE_MB}MB 이하여야 합니다` })
      return
    }
    if (state.preview?.startsWith('blob:')) URL.revokeObjectURL(state.preview)
    onChange({ preview: null, uploading: true, uploadError: null, url: null })

    try {
      const resized = await resizeImage(file)
      const preview = URL.createObjectURL(resized)
      onChange({ preview })

      const supabase = createClient()
      const ext = resized.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${side}.${ext}`

      const { data, error } = await supabase.storage
        .from('battle-images')
        .upload(path, resized, { upsert: true })

      if (error) throw new Error(error.message)

      const { data: { publicUrl } } = supabase.storage.from('battle-images').getPublicUrl(data.path)
      onChange({ uploading: false, url: publicUrl })
    } catch (e) {
      onChange({ uploading: false, uploadError: `업로드 중 오류: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  useImperativeHandle(ref, () => ({ upload: handleFile }))

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <div className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary/50">
        <input
          type="file" accept="image/*"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) { onEditFile ? onEditFile(f) : handleFile(f) }
            e.target.value = ''
          }}
        />
        {state.preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.preview} alt={`미리보기 ${side}`} className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-5 w-5 text-white" />
              <p className="text-xs font-semibold text-white">사진 변경</p>
            </div>
            {state.uploading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
                <svg className="h-8 w-8 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {!state.uploading && state.url && (
              <div className="absolute bottom-2 right-2 z-30 rounded-full bg-emerald-500 p-1">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
            {state.uploading ? (
              <svg className="h-8 w-8 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                <div className="rounded-2xl bg-muted p-3.5">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">클릭 또는 드래그</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">사진 대신 밑에 글로 적어도 됩니다</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {state.uploadError && <p className="text-xs text-rose-500">{state.uploadError}</p>}

      {!hasImage && (
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground shrink-0">배경색</span>
          <div className="flex gap-1.5">
            {TEXT_BG_COLORS.map((color, i) => (
              <button
                key={i} type="button"
                onClick={() => onChange({ selectedColor: i })}
                style={{
                  backgroundColor: color.bg,
                  boxShadow: state.selectedColor === i ? `0 0 0 2px white, 0 0 0 3.5px ${color.bg}` : undefined,
                  border: color.bg === '#f8fafc' ? '1px solid #e2e8f0' : undefined,
                }}
                className={['h-5 w-5 rounded-full transition-transform', state.selectedColor === i ? 'scale-125' : 'hover:scale-110'].join(' ')}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            {hasImage ? <>설명 <span className="text-muted-foreground/50">(선택)</span></> : <>텍스트 내용 <span className="text-muted-foreground/50">(이미지로 변환됩니다)</span></>}
          </label>
          <span className={['text-xs tabular-nums transition-colors', atLimit ? 'font-semibold text-destructive' : nearLimit ? 'text-orange-400' : 'text-muted-foreground/50'].join(' ')}>
            {state.desc.length}/{MAX_DESC}
          </span>
        </div>
        <textarea
          value={state.desc}
          onChange={(e) => onChange({ desc: e.target.value.slice(0, MAX_DESC) })}
          maxLength={MAX_DESC} rows={2}
          placeholder={hasImage ? `사진 ${side}에 대해 설명해주세요` : '텍스트를 입력하면 이미지로 변환됩니다'}
          className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>
    </div>
  )
}))

const initSlot = (): SlotState => ({ preview: null, url: null, uploading: false, uploadError: null, desc: '', selectedColor: 0 })

// ─── 미리보기 카드 ────────────────────────────────────────────────
const CAT_BADGE_COLORS: Record<BetterCategory, { bg: string; text: string }> = {
  fashion:    { bg: '#EFF6FF', text: '#2563EB' },
  appearance: { bg: '#FDF2F8', text: '#BE185D' },
  love:       { bg: '#FFF1F2', text: '#F43F5E' },
  shopping:   { bg: '#FFFBEB', text: '#D97706' },
  food:       { bg: '#FFF7ED', text: '#EA580C' },
  it:         { bg: '#F5F3FF', text: '#7C3AED' },
  decision:   { bg: '#F0FDF4', text: '#15803D' },
}

function BattlePreviewCard({
  title, category, slotA, slotB,
}: {
  title: string
  category: BetterCategory
  slotA: SlotState
  slotB: SlotState
}) {
  const cat = CATEGORY_MAP[category]
  const catStyle = CAT_BADGE_COLORS[category]

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden',
      border: '1px solid var(--color-border)',
      background: 'var(--color-card)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      {/* 헤더 */}
      <div style={{ padding: '12px 14px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          borderRadius: 999, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700,
          background: catStyle.bg, color: catStyle.text, marginBottom: 6,
        }}>
          {cat.emoji} {cat.label}
        </span>
        <p style={{
          fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.35,
          color: 'var(--color-foreground)',
        }}>
          {title}
        </p>
      </div>

      {/* 이미지 영역 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)' }}>
        {([slotA, slotB] as const).map((slot, i) => {
          const side = i === 0 ? 'A' : 'B'
          const imgSrc = slot.preview || slot.url
          const color = TEXT_BG_COLORS[slot.selectedColor]

          return (
            <div key={side} style={{
              position: 'relative', paddingTop: '100%',
              borderLeft: side === 'B' ? '2px solid var(--color-background)' : undefined,
            }}>
              {imgSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgSrc} alt={`사진 ${side}`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                // 텍스트 전용 미리보기
                <div style={{
                  position: 'absolute', inset: 0,
                  background: color.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                }}>
                  <p style={{
                    color: color.text, fontWeight: 700, fontSize: '0.85rem',
                    textAlign: 'center', lineHeight: 1.4,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 6, WebkitBoxOrient: 'vertical',
                  }}>
                    {slot.desc || `사진 ${side}`}
                  </p>
                </div>
              )}

              {/* 사이드 레이블 */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 10,
                pointerEvents: 'none',
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color: 'white', fontWeight: 900, fontSize: '1.1rem',
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.5)',
                }}>{side}</span>
              </div>

              {/* 설명 */}
              {slot.url && slot.desc && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: '4px 8px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.62rem', lineHeight: 1.3 }}>{slot.desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 푸터 힌트 */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)' }}>
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-muted-foreground)' }}>
          사진을 탭하여 선택하는 화면으로 표시됩니다
        </p>
      </div>
    </div>
  )
}

// ─── 업로드 상태 ─────────────────────────────────────────────────
interface UploadState {
  running: boolean
  step: string
  progress: number
  error: string | null
  done: boolean
}

const initUpload = (): UploadState => ({ running: false, step: '', progress: 0, error: null, done: false })

// ─── 메인 폼 ──────────────────────────────────────────────────────
export function CreateBattleForm() {
  const router = useRouter()
  const [slotA, setSlotA] = useState<SlotState>(initSlot)
  const [slotB, setSlotB] = useState<SlotState>(initSlot)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<BetterCategory | null>(null)
  const [view, setView] = useState<'input' | 'preview'>('input')
  const [upload, setUpload] = useState<UploadState>(initUpload)
  const [editTarget, setEditTarget] = useState<{ file: File; side: 'A' | 'B' } | null>(null)

  const slotARef = useRef<SlotHandle>(null)
  const slotBRef = useRef<SlotHandle>(null)

  const previewRef = useRef({ a: slotA.preview, b: slotB.preview })
  useEffect(() => { previewRef.current.a = slotA.preview }, [slotA.preview])
  useEffect(() => { previewRef.current.b = slotB.preview }, [slotB.preview])
  useEffect(() => () => {
    if (previewRef.current.a?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current.a)
    if (previewRef.current.b?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current.b)
  }, [])

  const handleChangeA = useCallback((p: Partial<SlotState>) => setSlotA(s => ({ ...s, ...p })), [])
  const handleChangeB = useCallback((p: Partial<SlotState>) => setSlotB(s => ({ ...s, ...p })), [])

  const handleEditorDone = useCallback((blob: Blob) => {
    if (!editTarget) return
    const file = new File([blob], `edited-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const ref = editTarget.side === 'A' ? slotARef : slotBRef
    ref.current?.upload(file)
    setEditTarget(null)
  }, [editTarget])

  const handleEditorCancel = useCallback(() => setEditTarget(null), [])

  const hasContentA = !!slotA.url || !!slotA.desc.trim()
  const hasContentB = !!slotB.url || !!slotB.desc.trim()
  const isUploading = slotA.uploading || slotB.uploading
  const canPreview = hasContentA && hasContentB && !isUploading && !!category && !!title.trim()

  // ── 이대로 올리기 ──────────────────────────────────────────────
  async function handleSubmit() {
    setUpload({ running: true, step: '이미지 업로드 중... (1/2)', progress: 10, error: null, done: false })

    let urlA = slotA.url
    let urlB = slotB.url

    try {
      if (!urlA && slotA.desc.trim()) {
        urlA = await uploadTextImage(slotA.desc.trim(), slotA.selectedColor, 'A')
      }
      if (!urlB && slotB.desc.trim()) {
        urlB = await uploadTextImage(slotB.desc.trim(), slotB.selectedColor, 'B')
      }
    } catch (e) {
      setUpload({ running: false, step: '', progress: 0, error: `이미지 업로드 오류: ${e instanceof Error ? e.message : String(e)}`, done: false })
      return
    }

    if (!urlA || !urlB) {
      setUpload({ running: false, step: '', progress: 0, error: 'A와 B 모두 이미지 또는 텍스트가 필요합니다', done: false })
      return
    }

    setUpload(u => ({ ...u, step: 'Better 저장 중... (2/2)', progress: 60 }))

    const formData = new FormData()
    formData.set('title', title.trim())
    formData.set('imageAUrl', urlA)
    formData.set('imageBUrl', urlB)
    formData.set('descriptionA', slotA.url ? slotA.desc : '')
    formData.set('descriptionB', slotB.url ? slotB.desc : '')
    formData.set('category', category ?? 'decision')

    try {
      const result = await saveBattle(null, formData)
      if (result && 'error' in result) {
        setUpload({ running: false, step: '', progress: 0, error: result.error, done: false })
        return
      }
      setUpload({ running: false, step: '완료! 🎉', progress: 100, error: null, done: true })
      setTimeout(() => router.push('/profile'), 1200)
    } catch (e) {
      setUpload({ running: false, step: '', progress: 0, error: `저장 오류: ${e instanceof Error ? e.message : String(e)}`, done: false })
    }
  }

  // ── 미리보기 화면 ──────────────────────────────────────────────
  if (view === 'preview') {
    const isRunning = upload.running || upload.done

    return (
      <div className="space-y-5">
        {/* 진행률 바 */}
        {(isRunning || upload.error) && (
          <div style={{ height: 4, borderRadius: 999, background: 'var(--color-muted)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${upload.progress}%`,
              background: upload.error ? '#F43F5E' : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        )}

        {/* 헤더 */}
        <div>
          <p className="text-lg font-black">미리보기</p>
          <p className="text-xs text-muted-foreground mt-0.5">실제로 보여질 모습입니다</p>
        </div>

        {/* 미리보기 카드 */}
        <BattlePreviewCard title={title} category={category!} slotA={slotA} slotB={slotB} />

        {/* 에러 메시지 */}
        {upload.error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {upload.error}
          </div>
        )}

        {/* 완료 메시지 */}
        {upload.done && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            {upload.step}
          </div>
        )}

        {/* 버튼 */}
        {!upload.done && (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={upload.running}
              onClick={() => { setUpload(initUpload()); setView('input') }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
            >
              <ArrowLeft size={15} />
              수정하기
            </button>
            <button
              type="button"
              disabled={upload.running}
              onClick={handleSubmit}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {upload.running ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {upload.step}
                </>
              ) : '이대로 올리기'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── 입력 화면 ──────────────────────────────────────────────────
  return (
    <>
    {editTarget && (
      <ImageEditor
        file={editTarget.file}
        onDone={handleEditorDone}
        onCancel={handleEditorCancel}
      />
    )}
    <div className="space-y-8">
      {/* 카테고리 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          카테고리 <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id} type="button"
              onClick={() => setCategory(cat.id)}
              className={[
                'flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all',
                category === cat.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent',
              ].join(' ')}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-xs font-semibold">{cat.label}</span>
            </button>
          ))}
        </div>
        {category ? (
          <p className="text-xs text-muted-foreground">{CATEGORY_MAP[category].description}</p>
        ) : (
          <p className="text-xs text-muted-foreground/50">카테고리를 먼저 선택해주세요</p>
        )}
      </div>

      {/* 제목 */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">제목</label>
        <input
          id="title" type="text" required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="어떤 걸 비교하나요? (예: 어떤 프로필 사진이 더 나아?)"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>

      {/* 사진 두 장 */}
      <div className="flex items-start gap-3">
        <ImageSlot ref={slotARef} side="A" state={slotA} onChange={handleChangeA} onEditFile={(f) => setEditTarget({ file: f, side: 'A' })} />
        <div className="flex shrink-0 flex-col items-center pt-16">
          <div className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-black tracking-widest text-muted-foreground shadow-sm">VS</div>
        </div>
        <ImageSlot ref={slotBRef} side="B" state={slotB} onChange={handleChangeB} onEditFile={(f) => setEditTarget({ file: f, side: 'B' })} />
      </div>

      {/* 미리보기 버튼 */}
      <button
        type="button"
        disabled={!canPreview}
        onClick={() => setView('preview')}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            업로드 중…
          </span>
        ) : !category ? '카테고리를 선택해주세요'
          : !title.trim() ? '제목을 입력해주세요'
          : (!hasContentA || !hasContentB) ? 'A와 B 모두 내용을 입력해주세요'
          : '미리보기'}
      </button>
    </div>
    </>
  )
}
