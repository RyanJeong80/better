'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'better_user_level'

export function LevelUpToast({
  currentLevel,
  levelName,
  emoji,
}: {
  currentLevel: number
  levelName: string
  emoji: string
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10)
      if (stored > 0 && currentLevel > stored) {
        setShow(true)
        const t = setTimeout(() => setShow(false), 3200)
        return () => clearTimeout(t)
      }
    } finally {
      localStorage.setItem(LS_KEY, String(currentLevel))
    }
  }, [currentLevel])

  if (!show) return null

  return (
    <>
      <style>{`
        @keyframes _lvlIn  { from { opacity:0; transform:translateY(40px) scale(0.85) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes _lvlOut { from { opacity:1; transform:translateY(0) scale(1) } to { opacity:0; transform:translateY(-20px) scale(0.9) } }
        @keyframes _confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity:1 }
          100% { transform: translateY(120px) rotate(720deg); opacity:0 }
        }
        ._lvlToast { animation: _lvlIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards }
        ._lvlToast._lvlDone { animation: _lvlOut 0.35s ease-in forwards }
      `}</style>

      {/* 배경 오버레이 */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => setShow(false)}
      >
        {/* 파티클 */}
        {['#6366F1','#8B5CF6','#F59E0B','#10B981','#EF4444','#3B82F6'].map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '30%',
              left: `${15 + i * 14}%`,
              width: 10, height: 10,
              borderRadius: i % 2 === 0 ? '50%' : 2,
              background: c,
              animation: `_confetti ${0.9 + i * 0.15}s ease-out ${i * 0.08}s forwards`,
            }}
          />
        ))}

        {/* 카드 */}
        <div
          className="_lvlToast"
          style={{
            background: 'white',
            borderRadius: 24,
            padding: '32px 40px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: 280,
          }}
        >
          <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 12 }}>{emoji}</div>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366F1', marginBottom: 4, letterSpacing: '0.05em' }}>
            LEVEL UP!
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 6 }}>{levelName}</p>
          <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>레벨이 올랐어요! 🎉</p>
        </div>
      </div>
    </>
  )
}
