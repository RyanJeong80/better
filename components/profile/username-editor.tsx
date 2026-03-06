'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { checkUsernameAvailable, updateUsername, type UsernameState } from '@/actions/users'

function SaveButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
    >
      {pending ? '저장 중…' : '저장'}
    </button>
  )
}

export function UsernameEditor({ currentUsername }: { currentUsername: string }) {
  const [editing, setEditing] = useState(false)
  const [state, formAction] = useActionState<UsernameState, FormData>(updateUsername, null)
  const [value, setValue] = useState(currentUsername)
  const [checking, setChecking] = useState(false)
  const [availability, setAvailability] = useState<{ available: boolean; error?: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (state === null && editing) {
      // 저장 성공 시 (state가 null로 리셋되면서 revalidate됨)
    }
  }, [state, editing])

  useEffect(() => {
    clearTimeout(timerRef.current)
    setAvailability(null)
    if (!editing || value === currentUsername || value.length < 2) return

    setChecking(true)
    timerRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(value)
        setAvailability(result)
      } catch {
        setAvailability(null)
      } finally {
        setChecking(false)
      }
    }, 500)

    return () => clearTimeout(timerRef.current)
  }, [value, editing, currentUsername])

  const isUnavailable = availability !== null && !availability.available
  const isAvailable = availability?.available === true

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">@{currentUsername}</span>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          변경
        </button>
      </div>
    )
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData)
        setEditing(false)
      }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            name="username"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="rounded-lg border border-input bg-background px-3 py-1.5 pr-7 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            style={isUnavailable ? { borderColor: '#F43F5E' } : isAvailable ? { borderColor: '#10B981' } : {}}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">
            {checking && <span className="animate-pulse text-muted-foreground">⋯</span>}
            {!checking && isAvailable && <span className="text-emerald-500">✓</span>}
            {!checking && isUnavailable && <span className="text-rose-500">✗</span>}
          </span>
        </div>
        <SaveButton disabled={isUnavailable || checking || value === currentUsername} />
        <button
          type="button"
          onClick={() => { setEditing(false); setValue(currentUsername) }}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          취소
        </button>
      </div>

      {!checking && isUnavailable && (
        <p className="text-xs text-rose-500">{availability?.error}</p>
      )}
      {!checking && isAvailable && (
        <p className="text-xs text-emerald-600">사용 가능한 닉네임이에요</p>
      )}
      {state?.error && (
        <p className="text-xs text-rose-500">{state.error}</p>
      )}
    </form>
  )
}
