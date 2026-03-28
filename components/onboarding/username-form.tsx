'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { checkUsernameAvailable, setUsername, type UsernameState } from '@/actions/users'
import { COUNTRY_OPTIONS, countryToFlag } from '@/lib/utils/country'

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
    >
      {pending ? '저장 중…' : '닉네임 설정하기'}
    </button>
  )
}

export function UsernameForm() {
  const [state, formAction] = useActionState<UsernameState, FormData>(setUsername, null)
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [availability, setAvailability] = useState<{ available: boolean; error?: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timerRef.current)
    setAvailability(null)

    if (value.length < 2) return

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
  }, [value])

  const isUnavailable = availability !== null && !availability.available
  const isAvailable = availability?.available === true
  const [country, setCountry] = useState('')

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-semibold">
          닉네임
        </label>
        <div className="relative">
          <input
            id="username"
            name="username"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="예: better_user"
            autoComplete="off"
            className="w-full rounded-xl border border-input bg-white px-4 py-3 pr-10 text-sm outline-none transition-shadow focus:ring-2 focus:ring-indigo-400"
            style={isUnavailable ? { borderColor: '#F43F5E' } : isAvailable ? { borderColor: '#10B981' } : {}}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">
            {checking && <span className="animate-pulse text-muted-foreground">⋯</span>}
            {!checking && isAvailable && <span className="text-emerald-500">✓</span>}
            {!checking && isUnavailable && <span className="text-rose-500">✗</span>}
          </span>
        </div>

        {/* 상태 메시지 */}
        {!checking && isAvailable && (
          <p className="text-xs font-medium text-emerald-600">사용 가능한 닉네임이에요</p>
        )}
        {!checking && isUnavailable && (
          <p className="text-xs font-medium text-rose-500">{availability?.error}</p>
        )}
        {!isAvailable && !isUnavailable && (
          <p className="text-xs text-muted-foreground">2~20자, 한글·영문·숫자·_ 사용 가능</p>
        )}
      </div>

      {/* 국적 선택 */}
      <div className="space-y-2">
        <label htmlFor="country" className="text-sm font-semibold">
          국적 <span className="text-muted-foreground font-normal">(선택)</span>
        </label>
        <div className="relative">
          <select
            id="country"
            name="country"
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-indigo-400 appearance-none"
          >
            <option value="">선택 안함</option>
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code}>
                {countryToFlag(c.code)} {c.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</span>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton disabled={isUnavailable || checking} />
    </form>
  )
}
