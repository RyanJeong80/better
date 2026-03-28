'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, and, ne } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

const USERNAME_REGEX = /^[가-힣a-zA-Z0-9_]{2,20}$/

function validateUsername(username: string): string | null {
  if (!username) return '닉네임을 입력해주세요'
  if (!USERNAME_REGEX.test(username)) return '2~20자의 한글, 영문, 숫자, _만 사용 가능합니다'
  return null
}

// 실시간 중복 확인 (클라이언트에서 호출)
export async function checkUsernameAvailable(
  username: string,
): Promise<{ available: boolean; error?: string }> {
  const validationError = validateUsername(username)
  if (validationError) return { available: false, error: validationError }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: { id: true },
  })

  if (!existing) return { available: true }
  if (user && existing.id === user.id) return { available: true }
  return { available: false, error: '이미 사용 중인 닉네임입니다' }
}

export type UsernameState = { error: string } | null

// 최초 닉네임 설정 (온보딩)
export async function setUsername(
  _prev: UsernameState,
  formData: FormData,
): Promise<UsernameState> {
  const username = (formData.get('username') as string)?.trim()
  const country = (formData.get('country') as string)?.trim() || null

  const validationError = validateUsername(username)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const existing = await db.query.users.findFirst({
    where: and(eq(users.username, username), ne(users.id, user.id)),
    columns: { id: true },
  })
  if (existing) return { error: '이미 사용 중인 닉네임입니다' }

  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email!,
      username,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      country,
    })
    .onConflictDoUpdate({ target: users.id, set: { username, ...(country !== null ? { country } : {}) } })

  // auth 메타데이터에도 저장 → middleware에서 DB 없이 확인 가능
  await supabase.auth.updateUser({ data: { username } })

  revalidatePath('/', 'layout')
  redirect('/')
}

// 국적 업데이트
export async function updateCountry(country: string | null): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  await db.update(users).set({ country }).where(eq(users.id, user.id))
  revalidatePath('/', 'layout')
  return {}
}

// 프로필 사진 URL 업데이트
export async function updateAvatarUrl(avatarUrl: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id))
  revalidatePath('/', 'layout')
  return {}
}

// 프로필에서 닉네임 변경
export async function updateUsername(
  _prev: UsernameState,
  formData: FormData,
): Promise<UsernameState> {
  const username = (formData.get('username') as string)?.trim()

  const validationError = validateUsername(username)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const existing = await db.query.users.findFirst({
    where: and(eq(users.username, username), ne(users.id, user.id)),
    columns: { id: true },
  })
  if (existing) return { error: '이미 사용 중인 닉네임입니다' }

  await db.update(users).set({ username }).where(eq(users.id, user.id))
  await supabase.auth.updateUser({ data: { username } })

  revalidatePath('/', 'layout')
  return null
}
