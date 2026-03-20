'use client'

import { useState, useEffect } from 'react'

const WORDS = [
  { text: 'style',       color: '#6366F1' },
  { text: 'place',       color: '#10B981' },
  { text: 'person',      color: '#F43F5E' },
  { text: 'time',        color: '#F59E0B' },
  { text: 'food',        color: '#F97316' },
  { text: 'design',      color: '#8B5CF6' },
  { text: 'idea',        color: '#0EA5E9' },
  { text: 'name',        color: '#EC4899' },
  { text: 'color',       color: '#14B8A6' },
  { text: 'destination', color: '#06B6D4' },
]

const TYPE_MS   = 95
const ERASE_MS  = 55
const PAUSE_MS  = 1400
const GAP_MS    = 250

// 스플래시용 — 빠른 타이핑, 단어별 가변 PAUSE
const S_TYPE_MS  = 35
const S_ERASE_MS = 22
const S_GAP_MS   = 80
function splashPause(idx: number) {
  if (idx < 2) return 500
  if (idx < 4) return 200
  return 100
}

export function AnimatedWord() {
  const [idx, setIdx]           = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase]       = useState<'typing' | 'erasing'>('typing')
  const [cursor, setCursor]     = useState(true)

  // 커서 깜빡임
  useEffect(() => {
    const id = setInterval(() => setCursor((v) => !v), 520)
    return () => clearInterval(id)
  }, [])

  // 타이핑 / 지우기
  useEffect(() => {
    const word = WORDS[idx].text

    if (phase === 'typing') {
      if (displayed.length < word.length) {
        const t = setTimeout(
          () => setDisplayed(word.slice(0, displayed.length + 1)),
          TYPE_MS,
        )
        return () => clearTimeout(t)
      }
      // 다 쓴 뒤 잠깐 멈춤 → 지우기
      const t = setTimeout(() => setPhase('erasing'), PAUSE_MS)
      return () => clearTimeout(t)
    }

    if (phase === 'erasing') {
      if (displayed.length > 0) {
        const t = setTimeout(
          () => setDisplayed(displayed.slice(0, -1)),
          ERASE_MS,
        )
        return () => clearTimeout(t)
      }
      // 다 지운 뒤 잠깐 멈춤 → 다음 단어
      const t = setTimeout(() => {
        setIdx((i) => (i + 1) % WORDS.length)
        setPhase('typing')
      }, GAP_MS)
      return () => clearTimeout(t)
    }
  }, [phase, displayed, idx])

  const { color } = WORDS[idx]

  return (
    <span style={{ display: 'inline-block', color, fontStyle: 'italic', minWidth: '2ch' }}>
      {displayed}
      <span style={{
        display: 'inline-block', width: '3px', marginLeft: '3px',
        background: color, borderRadius: '2px', verticalAlign: 'baseline',
        height: '0.85em', opacity: cursor ? 1 : 0, transition: 'opacity 0.1s',
      }} />
    </span>
  )
}

export function SplashAnimatedWord() {
  const [idx, setIdx]             = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase]         = useState<'typing' | 'erasing'>('typing')
  const [cursor, setCursor]       = useState(true)

  useEffect(() => {
    const id = setInterval(() => setCursor((v) => !v), 520)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const word = WORDS[idx].text
    if (phase === 'typing') {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), S_TYPE_MS)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('erasing'), splashPause(idx))
      return () => clearTimeout(t)
    }
    if (phase === 'erasing') {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), S_ERASE_MS)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => { setIdx((i) => (i + 1) % WORDS.length); setPhase('typing') }, S_GAP_MS)
      return () => clearTimeout(t)
    }
  }, [phase, displayed, idx])

  const { color } = WORDS[idx]

  return (
    <span style={{ display: 'inline-block', color, fontStyle: 'italic', minWidth: '2ch' }}>
      {displayed}
      <span style={{
        display: 'inline-block', width: '3px', marginLeft: '3px',
        background: color, borderRadius: '2px', verticalAlign: 'baseline',
        height: '0.85em', opacity: cursor ? 1 : 0, transition: 'opacity 0.1s',
      }} />
    </span>
  )
}
