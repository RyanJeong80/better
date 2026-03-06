'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ImagePlus } from 'lucide-react'
import { createBattle, type BattleState } from '@/actions/battles'

const MAX_DESC = 100

// ─── 이미지 업로드 슬롯 ───────────────────────────────────────────
function ImageSlot({ side }: { side: 'A' | 'B' }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [desc, setDesc] = useState('')

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const nearLimit = desc.length >= 80
  const atLimit = desc.length >= MAX_DESC

  return (
    <div className="flex-1 min-w-0 space-y-3">
      {/* 업로드 존 */}
      <div className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary/50">
        <input
          type="file"
          name={`image${side}`}
          accept="image/*"
          required
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {preview ? (
          <>
            <img
              src={preview}
              alt={`미리보기 ${side}`}
              className="h-full w-full object-cover"
            />
            {/* 호버 오버레이 */}
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-5 w-5 text-white" />
              <p className="text-xs font-semibold text-white">사진 변경</p>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
            <div className="rounded-2xl bg-muted p-3.5">
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">클릭 또는 드래그</p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">JPG · PNG · GIF · WEBP</p>
            </div>
          </div>
        )}
      </div>

      {/* 설명 입력 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            설명 <span className="text-muted-foreground/50">(선택)</span>
          </label>
          <span
            className={[
              'text-xs tabular-nums transition-colors',
              atLimit
                ? 'font-semibold text-destructive'
                : nearLimit
                  ? 'text-orange-400'
                  : 'text-muted-foreground/50',
            ].join(' ')}
          >
            {desc.length}/{MAX_DESC}
          </span>
        </div>
        <textarea
          name={`description${side}`}
          value={desc}
          onChange={(e) => setDesc(e.target.value.slice(0, MAX_DESC))}
          maxLength={MAX_DESC}
          rows={2}
          placeholder={`사진 ${side}에 대해 설명해주세요`}
          className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>
    </div>
  )
}

// ─── 제출 버튼 (useFormStatus로 로딩 처리) ─────────────────────────
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          업로드 중…
        </span>
      ) : (
        '만들기'
      )}
    </button>
  )
}

// ─── 메인 폼 ──────────────────────────────────────────────────────
export function CreateBattleForm() {
  const [state, formAction] = useActionState<BattleState, FormData>(createBattle, null)

  if (state && 'success' in state) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card py-20 text-center">
        <div className="text-4xl">🎉</div>
        <p className="text-lg font-bold">새 Better 올리기가 성공하였습니다</p>
        <a
          href="/"
          className="mt-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          홈으로 돌아가기
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-8">
      {state && 'error' in state && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {(state as { error: string }).error}
        </div>
      )}

      {/* 제목 */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          제목
        </label>
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
        <ImageSlot side="A" />

        {/* VS 배지 */}
        <div className="flex shrink-0 flex-col items-center pt-16">
          <div className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-black tracking-widest text-muted-foreground shadow-sm">
            VS
          </div>
        </div>

        <ImageSlot side="B" />
      </div>

      <SubmitButton />
    </form>
  )
}
