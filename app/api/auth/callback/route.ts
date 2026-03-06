import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=인증코드가 없습니다`)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user) {
      console.error('[callback] exchangeCodeForSession error:', error)
      return NextResponse.redirect(`${origin}/login?error=인증에 실패했습니다`)
    }

    // public.users에 upsert
    await db
      .insert(users)
      .values({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
        avatarUrl: data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture ?? null,
      })
      .onConflictDoNothing()
      .catch((e) => console.error('[callback] db upsert error:', e))

    // username 미설정 시 온보딩으로
    if (!data.user.user_metadata?.username) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    return NextResponse.redirect(`${origin}/`)
  } catch (e) {
    console.error('[callback] unexpected error:', e)
    return NextResponse.redirect(`${origin}/login?error=인증에 실패했습니다`)
  }
}
