'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Capacitor } from '@capacitor/core'
import { signIn, signInWithGoogle, type AuthState } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth')
  return (
    <button
      type="submit"
      disabled={pending}
      className="relative w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('signingIn')}
        </span>
      ) : (
        t('login')
      )}
    </button>
  )
}

export function LoginForm({ message }: { message?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(signIn, null)
  const t = useTranslations('auth')

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Capacitor.isNativePlatform()) {
      const supabase = createClient()
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.touched.app://callback',
          skipBrowserRedirect: true,
        },
      })
      if (data?.url) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({
          url: data.url,
          windowName: '_self',
          presentationStyle: 'fullscreen',
          toolbarColor: '#EDE4DA',
        })
      }
    } else {
      await signInWithGoogle()
    }
  }

  return (
    <div className="space-y-4">
      {/* Google 로그인 */}
      <form onSubmit={handleGoogleLogin}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-input bg-background py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t('googleLogin')}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t('or')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* 이메일 로그인 */}
      <form action={formAction} className="space-y-4">
        {message && (
          <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        )}

        {state?.error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {state.error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">{t('email')}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">{t('password')}</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        <SubmitButton />

        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/signup" className="font-semibold text-foreground underline-offset-4 hover:underline">
            {t('signup')}
          </Link>
        </p>
      </form>
    </div>
  )
}
