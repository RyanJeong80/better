'use client'

import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ImagePlus, ArrowLeft, Loader2, X, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveBattle } from '@/actions/battles'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'
import dynamic from 'next/dynamic'

const ImageEditor = dynamic(
  () => import('@/components/battles/image-editor').then(m => ({ default: m.ImageEditor })),
  { ssr: false },
)

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
  { bg: '#E0F0EC', text: '#18181b' },
  { bg: '#EDE0F0', text: '#18181b' },
  { bg: '#F0E4E0', text: '#18181b' },
  { bg: '#E0EAF0', text: '#18181b' },
  { bg: '#F0EEE0', text: '#18181b' },
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
  file: File | null
}

interface SlotHandle {
  upload: (file: File) => void
}

const ImageSlot = memo(forwardRef<SlotHandle, {
  side: 'A' | 'B'
  state: SlotState
  onChange: (patch: Partial<SlotState>) => void
  onEdit?: () => void
}>(function ImageSlot({ side, state, onChange, onEdit }, ref) {
  const t = useTranslations('create')
  const hasImage = !!state.preview || state.uploading
  const nearLimit = state.desc.length >= 80
  const atLimit = state.desc.length >= MAX_DESC

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      onChange({ uploadError: t('fileSizeError', { maxMb: MAX_FILE_MB }) })
      return
    }
    if (state.preview?.startsWith('blob:')) URL.revokeObjectURL(state.preview)
    onChange({ preview: null, uploading: true, uploadError: null, url: null, file: null })

    try {
      const resized = await resizeImage(file)
      const preview = URL.createObjectURL(resized)
      onChange({ preview, file: resized })

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
      onChange({ uploading: false, uploadError: t('uploadError', { message: e instanceof Error ? e.message : String(e) }) })
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
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        {state.preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.preview} alt={`${side}`} className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-5 w-5 text-white" />
              <p className="text-xs font-semibold text-white">{t('changePhoto')}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('clickOrDrag')}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {state.uploadError && <p className="text-xs text-rose-500">{state.uploadError}</p>}

      {state.url && !state.uploading && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="w-full rounded-xl border border-border bg-background py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          {t('editImage')}
        </button>
      )}

      {!hasImage && (
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground shrink-0">{t('bgColor')}</span>
          <div className="flex gap-1.5">
            {TEXT_BG_COLORS.map((color, i) => (
              <button
                key={i} type="button"
                onClick={() => onChange({ selectedColor: i })}
                style={{
                  backgroundColor: color.bg,
                  boxShadow: state.selectedColor === i ? `0 0 0 2px white, 0 0 0 3.5px ${color.bg}` : undefined,
                  border: color.text === '#18181b' ? '1px solid #e2e8f0' : undefined,
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
            {hasImage
              ? <>{t('descLabel')} <span className="text-muted-foreground/50">{t('optional')}</span></>
              : <>{t('textContentLabel')} <span className="text-muted-foreground/50">{t('textConverted')}</span></>
            }
          </label>
          <span className={['text-xs tabular-nums transition-colors', atLimit ? 'font-semibold text-destructive' : nearLimit ? 'text-orange-400' : 'text-muted-foreground/50'].join(' ')}>
            {state.desc.length}/{MAX_DESC}
          </span>
        </div>
        <textarea
          value={state.desc}
          onChange={(e) => onChange({ desc: e.target.value.slice(0, MAX_DESC) })}
          maxLength={MAX_DESC} rows={2}
          placeholder={hasImage ? t('descPlaceholder', { side }) : t('orTypeText')}
          className="w-full resize-none rounded-xl border border-input px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
          style={{ backgroundColor: '#ffffff' }}
        />
      </div>
    </div>
  )
}))

const initSlot = (): SlotState => ({ preview: null, url: null, uploading: false, uploadError: null, desc: '', selectedColor: 0, file: null })

// ─── 태그 입력 ────────────────────────────────────────────────────
const MAX_TAGS = 5
const TAG_COLORS = { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' }

function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggIdx, setSuggIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = useTranslations('create')

  const cleanTag = (raw: string) =>
    raw.toLowerCase().replace(/^#+/, '').replace(/\s+/g, '').slice(0, 30)

  const addTag = (raw: string) => {
    const name = cleanTag(raw)
    if (!name || value.includes(name) || value.length >= MAX_TAGS) return
    onChange([...value, name])
    setInput('')
    setSuggestions([])
    setShowSuggestions(false)
    setSuggIdx(-1)
  }

  const removeTag = (name: string) => onChange(value.filter(t => t !== name))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSuggIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSuggIdx(i => Math.max(i - 1, -1)); return }
    if ((e.key === ' ' || e.key === 'Enter') && input.trim()) {
      e.preventDefault()
      if (suggIdx >= 0 && suggestions[suggIdx]) addTag(suggestions[suggIdx])
      else addTag(input.trim())
      return
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  useEffect(() => {
    const q = input.replace(/^#+/, '').trim()
    if (!q) { setSuggestions([]); setShowSuggestions(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/tags/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then((data: string[]) => {
          const filtered = data.filter(t => !value.includes(t))
          setSuggestions(filtered)
          setShowSuggestions(filtered.length > 0)
          setSuggIdx(-1)
        })
        .catch(() => {})
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [input, value])

  return (
    <div>
      {/* 배지 + 입력 래퍼 */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 12,
          border: '1.5px solid var(--color-input)',
          background: '#ffffff',
          cursor: 'text', minHeight: 44,
          transition: 'border-color 0.15s',
        }}
      >
        {value.map(tag => (
          <span
            key={tag}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 999,
              background: TAG_COLORS.bg, color: TAG_COLORS.text,
              border: `1px solid ${TAG_COLORS.border}`,
              fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
            }}
          >
            <Hash size={11} strokeWidth={2.5} />
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: TAG_COLORS.text, opacity: 0.6 }}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={value.length === 0 ? t('tagInputPlaceholder') : ''}
            style={{
              flex: 1, minWidth: 80, border: 'none', outline: 'none',
              background: 'transparent', fontSize: '0.85rem',
              color: '#000000',
            }}
          />
        )}
      </div>

      {/* 자동완성 드롭다운 */}
      {showSuggestions && (
        <div style={{
          marginTop: 4, borderRadius: 10, overflow: 'hidden',
          border: '1px solid var(--color-border)',
          background: 'var(--color-card)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          zIndex: 50, position: 'relative',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => addTag(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '9px 12px',
                background: i === suggIdx ? 'var(--color-accent)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: '0.82rem', color: 'var(--color-foreground)',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-border)' : undefined,
              }}
            >
              <Hash size={12} style={{ color: TAG_COLORS.text, flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{s}</span>
            </button>
          ))}
        </div>
      )}

      <p style={{ marginTop: 6, fontSize: '0.68rem', color: 'var(--color-muted-foreground)' }}>
        {t('tagHint', { max: MAX_TAGS, count: value.length })}
      </p>
    </div>
  )
}

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
  const t = useTranslations()
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
          {cat.emoji} {t(`categories.${category}` as Parameters<typeof t>[0])}
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
                <img src={imgSrc} alt={side}
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
                    {slot.desc || side}
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
          {t('create.previewHint')}
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
export function CreateBattleForm({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter()
  const t = useTranslations('create')
  const tCategories = useTranslations('categories')
  const [slotA, setSlotA] = useState<SlotState>(initSlot)
  const [slotB, setSlotB] = useState<SlotState>(initSlot)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<BetterCategory | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [view, setView] = useState<'input' | 'preview'>('input')
  const [upload, setUpload] = useState<UploadState>(initUpload)
  const [editTarget, setEditTarget] = useState<'A' | 'B' | null>(null)

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
    const ref = editTarget === 'A' ? slotARef : slotBRef
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
    setUpload({ running: true, step: t('uploadStep1'), progress: 10, error: null, done: false })

    // 두 슬롯 모두 이미지 없이 텍스트만 입력한 경우 → text-only 경로
    const isTextOnly = !slotA.url && !slotB.url && !!slotA.desc.trim() && !!slotB.desc.trim()

    let urlA = slotA.url
    let urlB = slotB.url

    if (!isTextOnly) {
      // 기존 경로: 이미지 없는 슬롯은 캔버스로 텍스트 이미지 생성 후 업로드
      try {
        if (!urlA && slotA.desc.trim()) {
          urlA = await uploadTextImage(slotA.desc.trim(), slotA.selectedColor, 'A')
        }
        if (!urlB && slotB.desc.trim()) {
          urlB = await uploadTextImage(slotB.desc.trim(), slotB.selectedColor, 'B')
        }
      } catch (e) {
        setUpload({ running: false, step: '', progress: 0, error: t('imageUploadError', { message: e instanceof Error ? e.message : String(e) }), done: false })
        return
      }

      if (!urlA || !urlB) {
        setUpload({ running: false, step: '', progress: 0, error: t('bothContentRequired'), done: false })
        return
      }
    }

    setUpload(u => ({ ...u, step: t('saveStep2'), progress: 60 }))

    const formData = new FormData()
    formData.set('title', title.trim())
    formData.set('imageAUrl', urlA ?? '')
    formData.set('imageBUrl', urlB ?? '')
    formData.set('descriptionA', slotA.url ? slotA.desc : '')
    formData.set('descriptionB', slotB.url ? slotB.desc : '')
    formData.set('isTextOnly', String(isTextOnly))
    formData.set('imageAText', isTextOnly ? slotA.desc.trim() : '')
    formData.set('imageBText', isTextOnly ? slotB.desc.trim() : '')
    formData.set('category', category ?? 'decision')
    formData.set('tags', JSON.stringify(selectedTags))

    try {
      const result = await saveBattle(null, formData)
      if (result && 'error' in result) {
        setUpload({ running: false, step: '', progress: 0, error: result.error, done: false })
        return
      }
      setUpload({ running: false, step: t('done'), progress: 100, error: null, done: true })
      setTimeout(() => {
        if (onClose) onClose()
        else router.push('/profile')
      }, 1200)
    } catch (e) {
      setUpload({ running: false, step: '', progress: 0, error: t('saveError', { message: e instanceof Error ? e.message : String(e) }), done: false })
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
          <p className="text-lg font-black">{t('previewTitle')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('previewSubtitle')}</p>
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
              {t('goBack')}
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
              ) : t('submitButton')}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── 입력 화면 ──────────────────────────────────────────────────
  return (
    <>
    {editTarget && (editTarget === 'A' ? slotA.file : slotB.file) && (
      <ImageEditor
        file={(editTarget === 'A' ? slotA.file : slotB.file)!}
        onDone={handleEditorDone}
        onCancel={handleEditorCancel}
      />
    )}
    <div className="space-y-8">
      {/* 카테고리 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('categoryLabel')} <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id
            return (
              <button
                key={cat.id} type="button"
                onClick={() => setCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all"
                style={{
                  backgroundColor: isSelected ? '#3D2B1F' : '#D4C4B0',
                  color: isSelected ? '#ffffff' : '#3D2B1F',
                  border: 'none',
                }}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-semibold">{tCategories(cat.id as Parameters<typeof tCategories>[0])}</span>
              </button>
            )
          })}
        </div>
        {category ? (
          <p className="text-xs text-muted-foreground">{tCategories(`${category}Desc` as Parameters<typeof tCategories>[0])}</p>
        ) : (
          <p className="text-xs text-muted-foreground/50">{t('categoryFirst')}</p>
        )}
      </div>

      {/* 제목 */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">{t('titleLabel')}</label>
        <input
          id="title" type="text" required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          className="w-full rounded-xl border border-input px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
          style={{ backgroundColor: '#ffffff' }}
        />
      </div>

      {/* 태그 */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {t('tagsLabel')} <span className="text-muted-foreground/50 text-xs font-normal">{t('optional')}</span>
        </label>
        <TagInput value={selectedTags} onChange={setSelectedTags} />
      </div>

      {/* 사진 두 장 */}
      <div className="flex items-start gap-3">
        <ImageSlot ref={slotARef} side="A" state={slotA} onChange={handleChangeA} onEdit={slotA.file ? () => setEditTarget('A') : undefined} />
        <div className="flex shrink-0 flex-col items-center pt-16">
          <div className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-black tracking-widest text-muted-foreground shadow-sm">VS</div>
        </div>
        <ImageSlot ref={slotBRef} side="B" state={slotB} onChange={handleChangeB} onEdit={slotB.file ? () => setEditTarget('B') : undefined} />
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
            {t('uploading')}
          </span>
        ) : !category ? t('categoryFirst')
          : !title.trim() ? t('titleNeeded')
          : (!hasContentA || !hasContentB) ? t('bothRequired')
          : t('previewTitle')}
      </button>
    </div>
    </>
  )
}
