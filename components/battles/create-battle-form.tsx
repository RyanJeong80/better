'use client'

import { memo, useActionState, useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveBattle, type BattleState } from '@/actions/battles'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants/categories'
import type { BetterCategory } from '@/lib/constants/categories'

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

      if (w <= MAX_IMAGE_PX && h <= MAX_IMAGE_PX) {
        resolve(file)
        return
      }

      const ratio = Math.min(MAX_IMAGE_PX / w, MAX_IMAGE_PX / h)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)

      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          canvas.width = 0
          canvas.height = 0
          resolve(blob
            ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            : file
          )
        },
        'image/jpeg',
        JPEG_QUALITY,
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
    // 단어 자체가 maxWidth 초과 시 글자 단위 분리
    if (ctx.measureText(word).width > maxWidth) {
      if (current) { lines.push(current); current = '' }
      for (const char of word) {
        const t = current + char
        if (ctx.measureText(t).width > maxWidth && current) {
          lines.push(current)
          current = char
        } else {
          current = t
        }
      }
    } else {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
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
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  const PADDING = 60
  const maxWidth = SIZE - PADDING * 2
  const maxHeight = SIZE - PADDING * 2

  // 캔버스에 꽉 차는 최대 폰트 크기를 이진 탐색으로 계산
  let lo = 20, hi = 260
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `700 ${mid}px 'Plus Jakarta Sans', 'Pretendard Variable', sans-serif`
    const wrapped = wrapText(ctx, text, maxWidth)
    const totalHeight = wrapped.length * mid * 1.3
    if (totalHeight <= maxHeight) lo = mid
    else hi = mid
  }
  const fontSize = lo

  ctx.font = `700 ${fontSize}px 'Plus Jakarta Sans', 'Pretendard Variable', sans-serif`
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  const lines = wrapText(ctx, text, maxWidth)
  const lineHeight = fontSize * 1.3
  const totalHeight = lines.length * lineHeight
  const startY = (SIZE - totalHeight) / 2 + fontSize

  lines.forEach((line, i) => {
    ctx.fillText(line, SIZE / 2, startY + i * lineHeight)
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = 0
      canvas.height = 0
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

  const { data: { publicUrl } } = supabase.storage
    .from('battle-images')
    .getPublicUrl(data.path)

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

const ImageSlot = memo(function ImageSlot({
  side,
  state,
  onChange,
}: {
  side: 'A' | 'B'
  state: SlotState
  onChange: (patch: Partial<SlotState>) => void
}) {
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

      const { data: { publicUrl } } = supabase.storage
        .from('battle-images')
        .getPublicUrl(data.path)

      onChange({ uploading: false, url: publicUrl })
    } catch (e) {
      onChange({
        uploading: false,
        uploadError: `업로드 중 오류: ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

  return (
    <div className="flex-1 min-w-0 space-y-3">
      {/* 업로드 영역 */}
      <div className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary/50">
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />

        {state.preview ? (
          <>
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

      {state.uploadError && (
        <p className="text-xs text-rose-500">{state.uploadError}</p>
      )}

      {/* 배경색 선택 — 이미지 없을 때만 표시 */}
      {!hasImage && (
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground shrink-0">배경색</span>
          <div className="flex gap-1.5">
            {TEXT_BG_COLORS.map((color, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ selectedColor: i })}
                style={{
                  backgroundColor: color.bg,
                  boxShadow: state.selectedColor === i ? `0 0 0 2px white, 0 0 0 3.5px ${color.bg}` : undefined,
                  border: color.bg === '#f8fafc' ? '1px solid #e2e8f0' : undefined,
                }}
                className={[
                  'h-5 w-5 rounded-full transition-transform',
                  state.selectedColor === i ? 'scale-125' : 'hover:scale-110',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      )}

      {/* 설명 / 텍스트 내용 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            {hasImage
              ? <>설명 <span className="text-muted-foreground/50">(선택)</span></>
              : <>텍스트 내용 <span className="text-muted-foreground/50">(이미지로 변환됩니다)</span></>
            }
          </label>
          <span className={['text-xs tabular-nums transition-colors', atLimit ? 'font-semibold text-destructive' : nearLimit ? 'text-orange-400' : 'text-muted-foreground/50'].join(' ')}>
            {state.desc.length}/{MAX_DESC}
          </span>
        </div>
        <textarea
          value={state.desc}
          onChange={(e) => onChange({ desc: e.target.value.slice(0, MAX_DESC) })}
          maxLength={MAX_DESC}
          rows={2}
          placeholder={hasImage ? `사진 ${side}에 대해 설명해주세요` : '텍스트를 입력하면 이미지로 변환됩니다'}
          className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>
    </div>
  )
})

const initSlot = (): SlotState => ({
  preview: null, url: null,
  uploading: false, uploadError: null,
  desc: '', selectedColor: 0,
})

// ─── 메인 폼 ──────────────────────────────────────────────────────
export function CreateBattleForm() {
  const router = useRouter()
  const [state, formAction] = useActionState<BattleState, FormData>(saveBattle, null)
  const [slotA, setSlotA] = useState<SlotState>(initSlot)
  const [slotB, setSlotB] = useState<SlotState>(initSlot)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [category, setCategory] = useState<BetterCategory | null>(null)

  const previewRef = useRef({ a: slotA.preview, b: slotB.preview })
  useEffect(() => { previewRef.current.a = slotA.preview }, [slotA.preview])
  useEffect(() => { previewRef.current.b = slotB.preview }, [slotB.preview])
  useEffect(() => {
    return () => {
      if (previewRef.current.a?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current.a)
      if (previewRef.current.b?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current.b)
    }
  }, [])

  // 저장 성공 → 완료 메시지 1.5초 표시 후 홈으로 이동
  useEffect(() => {
    if (state && 'success' in state) {
      const t = setTimeout(() => router.push('/'), 1500)
      return () => clearTimeout(t)
    }
  }, [state, router])

  const handleChangeA = useCallback((p: Partial<SlotState>) => setSlotA(s => ({ ...s, ...p })), [])
  const handleChangeB = useCallback((p: Partial<SlotState>) => setSlotB(s => ({ ...s, ...p })), [])

  const hasContentA = !!slotA.url || !!slotA.desc.trim()
  const hasContentB = !!slotB.url || !!slotB.desc.trim()
  const isUploading = slotA.uploading || slotB.uploading
  const canSubmit = hasContentA && hasContentB && !isUploading && !isGenerating && !isPending && !!category

  return (
    <form
      action={async (formData) => {
        console.log('[CreateBattleForm] submit start — category:', category, '| hasContentA:', hasContentA, '| hasContentB:', hasContentB)
        setGenerateError(null)
        let urlA = slotA.url
        let urlB = slotB.url

        // 이미지 없는 슬롯은 텍스트 → 이미지 변환 후 업로드
        if (!urlA || !urlB) {
          setIsGenerating(true)
          try {
            if (!urlA && slotA.desc.trim()) {
              console.log('[CreateBattleForm] generating text image A')
              urlA = await uploadTextImage(slotA.desc.trim(), slotA.selectedColor, 'A')
              console.log('[CreateBattleForm] text image A uploaded:', urlA)
            }
            if (!urlB && slotB.desc.trim()) {
              console.log('[CreateBattleForm] generating text image B')
              urlB = await uploadTextImage(slotB.desc.trim(), slotB.selectedColor, 'B')
              console.log('[CreateBattleForm] text image B uploaded:', urlB)
            }
          } catch (e) {
            console.error('[CreateBattleForm] image generation error:', e)
            setGenerateError(`이미지 생성 중 오류: ${e instanceof Error ? e.message : String(e)}`)
            setIsGenerating(false)
            return
          }
          setIsGenerating(false)
        }

        if (!urlA) { setGenerateError('사진 A가 없습니다. 이미지를 업로드하거나 텍스트를 입력해주세요.'); return }
        if (!urlB) { setGenerateError('사진 B가 없습니다. 이미지를 업로드하거나 텍스트를 입력해주세요.'); return }

        formData.set('imageAUrl', urlA)
        formData.set('imageBUrl', urlB)
        formData.set('descriptionA', slotA.url ? slotA.desc : '')
        formData.set('descriptionB', slotB.url ? slotB.desc : '')
        formData.set('category', category ?? 'decision')

        console.log('[CreateBattleForm] calling saveBattle — imageAUrl:', urlA.slice(0, 60), '| category:', category)
        startTransition(async () => {
          try {
            await formAction(formData)
          } catch (e) {
            console.error('[CreateBattleForm] formAction error:', e)
            setGenerateError(`제출 중 오류: ${e instanceof Error ? e.message : String(e)}`)
          }
        })
      }}
      className="space-y-8"
    >
      {state && 'success' in state && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          Better가 생성되었습니다! 홈으로 이동합니다…
        </div>
      )}

      {(state && 'error' in state || generateError) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {generateError ?? (state as { error: string }).error}
        </div>
      )}

      {/* 카테고리 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          카테고리 <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={[
                'flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all',
                category === cat.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-accent',
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
          id="title"
          name="title"
          type="text"
          required
          placeholder="어떤 걸 비교하나요? (예: 어떤 프로필 사진이 더 나아?)"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>

      {/* 사진 두 장 */}
      <div className="flex items-start gap-3">
        <ImageSlot side="A" state={slotA} onChange={handleChangeA} />
        <div className="flex shrink-0 flex-col items-center pt-16">
          <div className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-black tracking-widest text-muted-foreground shadow-sm">VS</div>
        </div>
        <ImageSlot side="B" state={slotB} onChange={handleChangeB} />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isUploading || isGenerating || isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {isGenerating ? '이미지 생성 중…' : isPending ? '저장 중…' : '업로드 중…'}
          </span>
        ) : !category ? '카테고리를 선택해주세요' : (!hasContentA || !hasContentB) ? 'A와 B 모두 내용을 입력해주세요' : '만들기'}
      </button>
    </form>
  )
}
