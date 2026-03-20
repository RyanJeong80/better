'use client'

import { useState, useEffect } from 'react'
import { SplashAnimatedWord } from './animated-word'

export function SplashScreen() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 2300)
    const t2 = setTimeout(() => setPhase('gone'), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      className="splash-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FDF2F8 100%)',
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
    >
      {/* 히어로 섹션과 동일한 블러 orb */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '-6rem', left: '-6rem',
          width: '18rem', height: '18rem',
          borderRadius: '50%',
          background: '#818CF8',
          filter: 'blur(90px)',
          opacity: 0.35,
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: '-6rem', right: '-6rem',
          width: '18rem', height: '18rem',
          borderRadius: '50%',
          background: '#C084FC',
          filter: 'blur(90px)',
          opacity: 0.25,
        }}
      />

      {/* 콘텐츠 — 히어로 섹션 구조 동일 */}
      <div style={{ position: 'relative', textAlign: 'center', padding: '1.5rem' }}>
        <h1
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            fontSize: '4.5rem',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#111827',
          }}
        >
          <span>Which</span>
          <SplashAnimatedWord />
          <span>is <span style={{ color: '#8B5CF6' }}>Better</span>?</span>
        </h1>

        <p style={{
          marginTop: '1.25rem',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: '#6B7280',
          lineHeight: 1.6,
        }}>
          AI 대신 HI(Human Intelligence)가<br />선택하는 당신의 고민!
        </p>
      </div>
    </div>
  )
}
