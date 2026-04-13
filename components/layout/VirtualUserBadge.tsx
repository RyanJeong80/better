'use client'

import { useEffect, useState } from 'react'

type VirtualUser = { id: string; name: string; country: string | null }

export function VirtualUserBadge() {
  const [vu, setVu] = useState<VirtualUser | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('admin_virtual_user')
    if (raw) {
      try { setVu(JSON.parse(raw)) } catch {}
    }
    const handler = () => {
      const raw2 = sessionStorage.getItem('admin_virtual_user')
      setVu(raw2 ? JSON.parse(raw2) : null)
    }
    window.addEventListener('admin_virtual_user_changed', handler)
    return () => window.removeEventListener('admin_virtual_user_changed', handler)
  }, [])

  if (!vu) return null

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: '#3D2B1F', color: '#EDE4DA' }}
    >
      <span>작성자:</span>
      <span>{vu.name}</span>
      {vu.country && <span>{vu.country}</span>}
    </div>
  )
}
