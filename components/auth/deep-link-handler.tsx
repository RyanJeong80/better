'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase/client'

export function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cleanup: (() => void) | undefined

    const setup = async () => {
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')

      const listener = await App.addListener('appUrlOpen', async (event) => {
        const url = new URL(event.url)
        const code = url.searchParams.get('code')
        if (!code) return

        const supabase = createClient()
        const { data } = await supabase.auth.exchangeCodeForSession(code)

        await Browser.close()

        if (data.user) {
          if (!data.user.user_metadata?.username) {
            router.push('/onboarding')
          } else {
            router.push('/')
          }
        }
      })

      cleanup = () => listener.remove()
    }

    setup()
    return () => cleanup?.()
  }, [router])

  return null
}
