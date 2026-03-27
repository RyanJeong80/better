'use client'

import type { RefObject } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useTranslations } from 'next-intl'
import { TEXT_BG_COLORS, getTextColorIdx } from '@/lib/constants/text-colors'

const SHARE_URL = process.env.NEXT_PUBLIC_SHARE_URL || 'https://better-ivory.vercel.app'

interface ShareCardProps {
  cardRef: RefObject<HTMLDivElement | null>
  battleId: string
  title: string
  imageAUrl: string
  imageBUrl: string
  pctA: number
  pctB: number
  total: number
  winner: 'A' | 'B' | null
  isTextOnly?: boolean
  imageAText?: string | null
  imageBText?: string | null
}

export function ShareCard({
  cardRef, battleId, title,
  imageAUrl, imageBUrl,
  pctA, pctB, total, winner,
  isTextOnly, imageAText, imageBText,
}: ShareCardProps) {
  const t = useTranslations('share')

  const winnerText =
    winner === 'A' ? t('winnerA', { percent: pctA })
    : winner === 'B' ? t('winnerB', { percent: pctB })
    : t('tie', { percent: Math.max(pctA, pctB) })

  const colorA = TEXT_BG_COLORS[getTextColorIdx(battleId, 0)]
  const colorB = TEXT_BG_COLORS[getTextColorIdx(battleId, 1)]

  return (
    <div
      ref={cardRef}
      style={{
        width: 1080,
        height: 1080,
        background: '#EDE4DA',
        display: 'flex',
        flexDirection: 'column',
        padding: 60,
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* 헤더: 로고 + 앱 이름 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36, flexShrink: 0 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: '#1a1a1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30,
        }}>
          🦦
        </div>
        <span style={{ fontSize: 38, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
          Touched
        </span>
      </div>

      {/* 제목 */}
      <p style={{
        fontSize: 34, fontWeight: 700, color: '#1a1a1a',
        margin: '0 0 24px', lineHeight: 1.3, flexShrink: 0,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {title}
      </p>

      {/* A/B 이미지 나란히 + VS 배지 */}
      <div style={{
        display: 'flex',
        position: 'relative',
        height: 420,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 28,
        flexShrink: 0,
      }}>
        {/* 이미지 A */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {isTextOnly ? (
            <div style={{
              width: '100%', height: '100%',
              background: colorA.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}>
              <p style={{
                color: colorA.text, fontWeight: 700, fontSize: 30,
                textAlign: 'center', lineHeight: 1.4, margin: 0,
              }}>
                {imageAText}
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageAUrl}
              alt="A"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)',
          }} />
          <span style={{
            position: 'absolute', bottom: 16, left: 20,
            color: 'white', fontSize: 60, fontWeight: 900, lineHeight: 1,
          }}>A</span>
          <span style={{
            position: 'absolute', bottom: 20, right: 16,
            color: 'white', fontSize: 38, fontWeight: 900,
          }}>{pctA}%</span>
        </div>

        {/* VS 배지 */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          width: 64, height: 64, borderRadius: 32,
          background: '#1a1a1a',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 900,
          border: '3px solid #EDE4DA',
        }}>
          VS
        </div>

        {/* 이미지 B */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {isTextOnly ? (
            <div style={{
              width: '100%', height: '100%',
              background: colorB.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}>
              <p style={{
                color: colorB.text, fontWeight: 700, fontSize: 30,
                textAlign: 'center', lineHeight: 1.4, margin: 0,
              }}>
                {imageBText}
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageBUrl}
              alt="B"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)',
          }} />
          <span style={{
            position: 'absolute', bottom: 20, left: 16,
            color: 'white', fontSize: 38, fontWeight: 900,
          }}>{pctB}%</span>
          <span style={{
            position: 'absolute', bottom: 16, right: 20,
            color: 'white', fontSize: 60, fontWeight: 900, lineHeight: 1,
          }}>B</span>
        </div>
      </div>

      {/* 결과 바 */}
      <div style={{ marginBottom: 28, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 26, color: '#1a1a1a' }}>A · {pctA}%</span>
          <span style={{ fontWeight: 800, fontSize: 26, color: '#1a1a1a' }}>{pctB}% · B</span>
        </div>
        <div style={{ height: 18, borderRadius: 9, background: '#c8bfb5', overflow: 'hidden' }}>
          <div style={{
            width: `${pctA}%`, height: '100%', borderRadius: 9,
            background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
          }} />
        </div>
      </div>

      {/* 우승자 문구 */}
      <p style={{
        fontSize: 42, fontWeight: 900, color: '#1a1a1a',
        margin: '0 0 10px', lineHeight: 1.2, flexShrink: 0,
      }}>
        {winnerText}
      </p>

      {/* 참여자 수 */}
      <p style={{ fontSize: 26, color: '#6b6058', fontWeight: 600, margin: 0, flexShrink: 0 }}>
        {t('participants', { count: total })}
      </p>

      {/* 스페이서 */}
      <div style={{ flex: 1 }} />

      {/* 하단: QR코드 + 다운로드 문구 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 8, display: 'inline-flex' }}>
          <QRCodeCanvas value={SHARE_URL} size={88} />
        </div>
        <p style={{
          fontSize: 26, color: '#1a1a1a', fontWeight: 700,
          textAlign: 'right', margin: 0, lineHeight: 1.4, maxWidth: 280,
        }}>
          {t('scanDownload')}
        </p>
      </div>
    </div>
  )
}
