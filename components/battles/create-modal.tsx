'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CreateBattleForm } from '@/components/battles/create-battle-form'

export function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('create')

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [open])

  if (!mounted || !open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onClose}
      onTouchMove={e => e.stopPropagation()}
    >
      <style>{`
        @keyframes _createModalUp {
          from { transform: translateY(100%) }
          to   { transform: translateY(0) }
        }
      `}</style>
      <div
        style={{
          background: '#EDE4DA',
          borderRadius: '20px 20px 0 0',
          maxHeight: '95dvh',
          display: 'flex', flexDirection: 'column',
          animation: '_createModalUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(61,43,31,0.2)' }} />
        </div>

        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 20px 12px',
          borderBottom: '1px solid rgba(61,43,31,0.12)',
          flexShrink: 0,
        }}>
          <p style={{ flex: 1, fontWeight: 800, fontSize: '1.05rem', color: '#3D2B1F' }}>
            {t('newTitle')}
          </p>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(61,43,31,0.08)',
              border: 'none', cursor: 'pointer', color: '#3D2B1F',
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div
          style={{
            overflowY: 'auto', flex: 1, padding: '20px 20px 48px',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
        >
          <CreateBattleForm onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body
  )
}
