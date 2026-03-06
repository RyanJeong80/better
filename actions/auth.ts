'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export type AuthState = { error: string } | null

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  // public.users에 upsert
  if (data.user) {
    await db
      .insert(users)
      .values({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name ?? null,
      })
      .onConflictDoNothing()
  }

  revalidatePath('/', 'layout')

  // username 미설정 시 온보딩으로
  if (!data.user?.user_metadata?.username) {
    redirect('/onboarding')
  }

  redirect('/')
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: { name: formData.get('name') as string },
    },
  })

  if (error) return { error: error.message }

  // 이메일 확인 없이 바로 로그인된 경우 온보딩으로
  if (data.session) {
    redirect('/onboarding')
  }

  redirect('/login?message=가입 확인 이메일을 보냈습니다. 메일함을 확인해주세요.')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_SUPABASE_URL

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) redirect('/login?error=구글 로그인에 실패했습니다')
  if (data.url) redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
