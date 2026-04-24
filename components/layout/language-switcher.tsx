'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'

const LANGUAGES = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
]

export function LanguageSwitcher() {
  const currentLocale = useLocale()
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  // localStorage → cookie 복원 (쿠키가 삭제된 경우 대비)
  useEffect(() => {
    const saved = localStorage.getItem('NEXT_LOCALE')
    if (saved && saved !== currentLocale && LANGUAGES.some(l => l.code === saved)) {
      document.cookie = `NEXT_LOCALE=${saved}; max-age=31536000; path=/; samesite=lax`
      window.location.reload()
    }
  }, [currentLocale])

  const handleOpen = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    setOpen(v => !v)
  }

  const handleSelect = (code: string) => {
    setOpen(false)
    document.cookie = `NEXT_LOCALE=${code}; max-age=31536000; path=/; samesite=lax`
    localStorage.setItem('NEXT_LOCALE', code)
    window.location.reload()
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        aria-label="Change language"
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.05rem', lineHeight: 1,
        }}
      >
        🌐
      </button>

      {open && createPortal(
        <>
          {/* 배경 닫기 레이어 */}
          <div
            onClick={() => setOpen(false)}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => { e.stopPropagation(); setOpen(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          />
          {/* 드롭다운 */}
          <div
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              right: dropdownPos.right,
              zIndex: 9999,
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              minWidth: 158,
            }}
          >
            {LANGUAGES.map(({ code, flag, label }, i) => {
              const active = code === currentLocale
              return (
                <button
                  key={code}
                  onClick={() => handleSelect(code)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px',
                    background: active ? 'rgba(99,102,241,0.08)' : 'none',
                    border: 'none',
                    borderBottom: i < LANGUAGES.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.88rem', fontWeight: active ? 700 : 500,
                    color: active ? '#6366F1' : 'var(--color-foreground)',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{flag}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && (
                    <span style={{ fontSize: '0.8rem', color: '#6366F1' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
