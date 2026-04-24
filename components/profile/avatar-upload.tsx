'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase/client'
import { updateAvatarUrl } from '@/actions/users'

const CROP_SIZE = 280

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  initial: string
  size?: number
}

export function AvatarUpload({ currentAvatarUrl, initial, size = 52 }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [pendingFile, setPendingFile] = useState<{ objectUrl: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setPendingFile({ objectUrl })
    e.target.value = ''
  }

  const handleCropConfirm = useCallback(async (croppedBlob: Blob) => {
    if (pendingFile) URL.revokeObjectURL(pendingFile.objectUrl)
    setPendingFile(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const path = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, croppedBlob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateAvatarUrl(publicUrl)
      setAvatarUrl(publicUrl)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setUploading(false)
    }
  }, [pendingFile])

  const handleCancel = useCallback(() => {
    if (pendingFile) URL.revokeObjectURL(pendingFile.objectUrl)
    setPendingFile(null)
  }, [pendingFile])

  const handleAvatarClick = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      setUploading(true)
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          width: 400,
          height: 400,
        })
        setUploading(false)
        if (image.dataUrl) {
          const res = await fetch(image.dataUrl)
          const blob = await res.blob()
          const objectUrl = URL.createObjectURL(blob)
          setPendingFile({ objectUrl })
        }
      } catch {
        // 사용자가 취소한 경우 무시
        setUploading(false)
      }
    } else {
      fileInputRef.current?.click()
    }
  }, [])

  const fontSize = `${(size * 0.025).toFixed(2)}rem`

  return (
    <>
      <style>{`@keyframes _av_spin { to { transform: rotate(360deg) } }`}</style>
      <button
        onClick={handleAvatarClick}
        disabled={uploading}
        style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize, fontWeight: 900, color: 'white',
          border: 'none', cursor: uploading ? 'default' : 'pointer',
          padding: 0, overflow: 'hidden', position: 'relative',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="profile"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initial
        )}
        {/* Camera edit hint */}
        {!uploading && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '36%',
            background: 'rgba(0,0,0,0.36)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '0.6rem', color: 'white', lineHeight: 1 }}>📷</span>
          </div>
        )}
        {/* Upload spinner */}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 20, height: 20,
              border: '2.5px solid rgba(255,255,255,0.35)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: '_av_spin 0.7s linear infinite',
            }} />
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {mounted && pendingFile && createPortal(
        <CropModal
          objectUrl={pendingFile.objectUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCancel}
        />,
        document.body,
      )}
    </>
  )
}

// ─── Crop Modal ───────────────────────────────────────────────────

function CropModal({
  objectUrl,
  onConfirm,
  onCancel,
}: {
  objectUrl: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  const clampOffset = useCallback((x: number, y: number, w: number, h: number) => ({
    x: Math.min(0, Math.max(CROP_SIZE - w, x)),
    y: Math.min(0, Math.max(CROP_SIZE - h, y)),
  }), [])

  const handleLoad = useCallback(() => {
    const img = imgRef.current!
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    const s = Math.max(CROP_SIZE / nw, CROP_SIZE / nh)
    const w = Math.round(nw * s)
    const h = Math.round(nh * s)
    const clamped = { x: Math.round(-(w - CROP_SIZE) / 2), y: Math.round(-(h - CROP_SIZE) / 2) }
    setScale(s)
    setImgSize({ w, h })
    setOffset(clamped)
    setLoaded(true)
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset(clampOffset(
      dragRef.current.ox + dx,
      dragRef.current.oy + dy,
      imgSize.w, imgSize.h,
    ))
  }

  const onPointerUp = () => { dragRef.current = null }

  const handleConfirm = () => {
    const img = imgRef.current
    if (!img || !loaded) return
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const srcX = (-offset.x) / scale
    const srcY = (-offset.y) / scale
    const srcSize = CROP_SIZE / scale
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 400, 400)
    canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.88)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
    >
      <div style={{
        background: 'white', borderRadius: 24,
        width: '100%', maxWidth: 340,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 20px 0',
          textAlign: 'center',
          fontWeight: 800, fontSize: '1rem', color: '#1F1F1F',
        }}>
          프로필 사진 편집
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 12px' }}>
          드래그하여 위치 조정
        </p>

        {/* Crop area */}
        <div
          style={{
            width: CROP_SIZE, height: CROP_SIZE,
            margin: '0 auto',
            overflow: 'hidden',
            position: 'relative',
            cursor: loaded ? 'grab' : 'default',
            touchAction: 'none',
            background: '#E5E7EB',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Hidden until loaded, then shown at calculated position */}
          <img
            ref={imgRef}
            src={objectUrl}
            alt=""
            draggable={false}
            onLoad={handleLoad}
            style={{
              display: loaded ? 'block' : 'none',
              position: 'absolute',
              left: offset.x,
              top: offset.y,
              width: imgSize.w,
              height: imgSize.h,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          {/* Loading spinner */}
          {!loaded && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <style>{`@keyframes _av_spin { to { transform: rotate(360deg) } }`}</style>
              <div style={{
                width: 28, height: 28,
                border: '3px solid #E5E7EB',
                borderTopColor: '#6366F1',
                borderRadius: '50%',
                animation: '_av_spin 0.7s linear infinite',
              }} />
            </div>
          )}
          {/* Rule-of-thirds grid overlay */}
          {loaded && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)
              `,
              backgroundSize: `${CROP_SIZE / 3}px ${CROP_SIZE / 3}px`,
            }} />
          )}
          {/* Border */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '2px solid rgba(255,255,255,0.55)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '16px 20px 20px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              fontWeight: 700, fontSize: '0.9rem',
              border: '1.5px solid #E5E7EB', background: 'white',
              cursor: 'pointer', color: '#374151',
            }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!loaded}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              fontWeight: 700, fontSize: '0.9rem',
              border: 'none',
              background: loaded ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#E5E7EB',
              cursor: loaded ? 'pointer' : 'not-allowed',
              color: 'white',
            }}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
