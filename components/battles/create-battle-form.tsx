'use client'

import { memo, useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveBattle, type BattleState } from '@/actions/battles'

const MAX_DESC = 100
const MAX_FILE_MB = 5
const MAX_IMAGE_PX = 1920   // 이 이상이면 리사이징
const JPEG_QUALITY = 0.85

// ─── 이미지 리사이징 ──────────────────────────────────────────────
// 원본 파일을 canvas로 리사이징해 업로드 크기·메모리 절약
// GIF는 애니메이션 보존을 위해 스킵
async function resizeImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file

  return new Promise((resolve) => {
    const img = new Image()
    const tempUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(tempUrl) // 로드 후 즉시 해제

      const { naturalWidth: w, naturalHeight: h } = img

      if (w <= MAX_IMAGE_PX && h <= MAX_IMAGE_PX) {
        resolve(file) // 충분히 작으면 원본 반환
        return
      }

      const ratio = Math.min(MAX_IMAGE_PX / w, MAX_IMAGE_PX / h)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)

      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          canvas.width = 0   // canvas 픽셀 버퍼 즉시 해제
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

// ─── 이미지 슬롯 ──────────────────────────────────────────────────
interface SlotState {
  preview: string | null   // blob: URL (언마운트·교체 시 revoke)
  url: string | null       // Supabase Storage 공개 URL
  uploading: boolean
  uploadError: string | null
  desc: string
}

// memo: 반대쪽 슬롯 state 변경 시 불필요한 re-render 방지
const ImageSlot = memo(function ImageSlot({
  side,
  state,
  onChange,
}: {
  side: 'A' | 'B'
  state: SlotState
  onChange: (patch: Partial<SlotState>) => void
}) {
  const nearLimit = state.desc.length >= 80
  const atLimit = state.desc.length >= MAX_DESC

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      onChange({ uploadError: `파일 크기는 ${MAX_FILE_MB}MB 이하여야 합니다` })
      return
    }

    // 이전 blob URL 해제 (교체 시 메모리 누수 방지)
    if (state.preview?.startsWith('blob:')) URL.revokeObjectURL(state.preview)

    // 업로드 시작 상태 — 리사이징 전이라도 UI 즉시 반응
    onChange({ preview: null, uploading: true, uploadError: null, url: null })

    try {
      const resized = await resizeImage(file)

      // 리사이징된 파일로 미리보기 (원본 File 객체는 이 시점에 참조 해제)
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
      // 실패 시 uploading 반드시 해제
      onChange({
        uploading: false,
        uploadError: `업로드 중 오류: ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <div className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary/50">
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = '' // 같은 파일 재선택 허용
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
                  <p className="mt-0.5 text-xs text-muted-foreground/60">JPG · PNG · GIF · WEBP · 최대 {MAX_FILE_MB}MB</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {state.uploadError && (
        <p className="text-xs text-rose-500">{state.uploadError}</p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            설명 <span className="text-muted-foreground/50">(선택)</span>
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
          placeholder={`사진 ${side}에 대해 설명해주세요`}
          className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>
    </div>
  )
})

const initSlot = (): SlotState => ({
  preview: null, url: null,
  uploading: false, uploadError: null, desc: '',
})

// ─── 메인 폼 ──────────────────────────────────────────────────────
export function CreateBattleForm() {
  const router = useRouter()
  const [state, formAction] = useActionState<BattleState, FormData>(saveBattle, null)
  const [slotA, setSlotA] = useState<SlotState>(initSlot)
  const [slotB, setSlotB] = useState<SlotState>(initSlot)

  // 언마운트 시 blob URL 해제용 ref
  const previewRef = useRef({ a: slotA.preview, b: slotB.preview })
  useEffect(() => { previewRef.current.a = slotA.preview }, [slotA.preview])
  useEffect(() => { previewRef.current.b = slotB.preview }, [slotB.preview])
  useEffect(() => {
    return () => {
      if (previewRef.current.a?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current.a)
      if (previewRef.current.b?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current.b)
    }
  }, [])

  // 저장 성공 → 홈으로 이동 (컴포넌트 언마운트로 blob URL 자동 revoke)
  useEffect(() => {
    if (state && 'success' in state) router.push('/')
  }, [state, router])

  // useCallback: ImageSlot에 안정적인 참조 전달 → memo 효과 극대화
  const handleChangeA = useCallback((p: Partial<SlotState>) => setSlotA(s => ({ ...s, ...p })), [])
  const handleChangeB = useCallback((p: Partial<SlotState>) => setSlotB(s => ({ ...s, ...p })), [])

  const isUploading = slotA.uploading || slotB.uploading
  const canSubmit = !!slotA.url && !!slotB.url && !isUploading

  return (
    <form
      action={async (formData) => {
        formData.set('imageAUrl', slotA.url ?? '')
        formData.set('imageBUrl', slotB.url ?? '')
        formData.set('descriptionA', slotA.desc)
        formData.set('descriptionB', slotB.desc)
        await formAction(formData)
      }}
      className="space-y-8"
    >
      {state && 'error' in state && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {(state as { error: string }).error}
        </div>
      )}

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
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            업로드 중…
          </span>
        ) : !canSubmit ? '사진 두 장을 업로드해주세요' : '만들기'}
      </button>
    </form>
  )
}
