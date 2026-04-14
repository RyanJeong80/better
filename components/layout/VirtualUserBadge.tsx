'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type VirtualUser = { id: string; name: string; country: string | null }

export function VirtualUserBadge() {
  const router = useRouter()
  const [vu, setVu] = useState<VirtualUser | null>(null)

  useEffect(() => {
    const sync = () => {
      const raw = sessionStorage.getItem('admin_virtual_user')
      setVu(raw ? JSON.parse(raw) : null)
    }
    sync()
    window.addEventListener('admin_virtual_user_changed', sync)
    return () => window.removeEventListener('admin_virtual_user_changed', sync)
  }, [])

  if (!vu) return null

  return (
    <button
      onClick={() => router.push('/admin')}
      style={{
        backgroundColor: '#FF6B35',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
      }}
    >
      ✏️ {vu.name}
    </button>
  )
}
