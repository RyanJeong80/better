'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'
import type { BetterCategory, CategoryFilter } from '@/lib/constants/categories'
import { MyBetterCard } from '@/components/battles/my-better-card'
import { deleteBattle } from '@/actions/battles'

export interface BattleWithStats {
  id: string
  title: string
  imageAUrl: string
  imageADescription: string | null
  imageBUrl: string
  imageBDescription: string | null
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
  votesA: number
  votesB: number
  total: number
  reasons: { choice: 'A' | 'B'; reason: string; voterId: string | null; voterName: string | null; voterAvatarUrl: string | null; voterCountry: string | null }[]
  createdAt: Date
  closedAt: Date | null
  winner: 'A' | 'B' | null
  likesCount: number
  category: BetterCategory
}

export function ProfileBetterList({ battles }: { battles: BattleWithStats[] }) {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const t = useTranslations()

  useEffect(() => { setMounted(true) }, [])

  async function handleDelete(id: string) {
    console.log('삭제 시작:', id)
    setDeleting(true)
    try {
      const result = await deleteBattle(id)
      console.log('삭제 결과:', result)
      if (result.success) {
        setDeletedIds(prev => new Set([...prev, id]))
        setDeleteTargetId(null)
      } else {
        alert('삭제에 실패했습니다: ' + (result.error ?? '알 수 없는 오류'))
      }
    } catch (e) {
      console.error('삭제 오류:', e)
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const visible = battles.filter(b => !deletedIds.has(b.id))
  const filtered = filter === 'all' ? visible : visible.filter((b) => b.category === filter)

  if (visible.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: 24, border: '1.5px dashed var(--color-border)', padding: '80px 0', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📸</div>
        <p style={{ fontWeight: 700 }}>{t('profile.noBettersYet')}</p>
        <p style={{ marginTop: 4, fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>{t('profile.noBettersDesc')}</p>
        <Link
          href="/battles/new"
          style={{
            marginTop: 24, borderRadius: 16, padding: '10px 24px',
            fontSize: '0.875rem', fontWeight: 700, color: 'white',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            textDecoration: 'none',
          }}
        >
          {t('profile.createFirstBetter')}
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 카테고리 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              flexShrink: 0, borderRadius: 999, padding: '6px 12px',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              border: 'none',
              background: filter === f.id ? '#3D2B1F' : '#D4C4B0',
              color: filter === f.id ? '#ffffff' : '#3D2B1F',
            }}
          >
            {f.emoji} {f.id === 'all' ? t('categories.all') : t(`categories.${f.id}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderRadius: 24, border: '1.5px dashed var(--color-border)', padding: '56px 0', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>
            {CATEGORY_FILTERS.find((f) => f.id === filter)?.emoji ?? '📂'}
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('profile.noCategoryBetters')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filtered.map((battle) => (
            <MyBetterCard
              key={battle.id}
              battle={battle}
              onDeleteClick={(id) => setDeleteTargetId(id)}
            />
          ))}
        </div>
      )}

      {mounted && deleteTargetId && createPortal(
        <div
          onClick={() => !deleting && setDeleteTargetId(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 24,
              margin: 16,
              maxWidth: 320,
              width: '100%',
            }}
          >
            <p style={{ color: '#111827', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>
              {t('better.deleteTitle')}
            </p>
            <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20 }}>
              {t('better.deleteMessage')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeleteTargetId(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: 12, borderRadius: 8,
                  border: '1px solid #D1D5DB', backgroundColor: '#ffffff',
                  color: '#111827', fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer', opacity: deleting ? 0.5 : 1,
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                disabled={deleting}
                style={{
                  flex: 1, padding: 12, borderRadius: 8,
                  border: 'none', backgroundColor: '#EF4444',
                  color: '#ffffff', fontSize: '0.875rem', fontWeight: 700,
                  cursor: 'pointer', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? t('better.deleting') : t('better.deleteConfirmBtn')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
