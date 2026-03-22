import { getRandomBattle } from '@/actions/battles'
import { createClient } from '@/lib/supabase/server'
import { HomeClient } from '@/components/home/home-client'

export type UserInfo = { initial: string; name: string; email: string }

export default async function HomePage() {
  const initialBattle = await getRandomBattle([], undefined, { skipAuth: true }).catch(() => null)

  let userInfo: UserInfo | null = null
  try {
    const supabase = await createClient()
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>(r =>
        setTimeout(() => r({ data: { user: null } }), 2000)
      ),
    ])
    if (data.user) {
      const nm = data.user.user_metadata?.name ?? data.user.user_metadata?.full_name ?? ''
      const email = data.user.email ?? ''
      userInfo = { initial: (nm || email || '?')[0].toUpperCase(), name: nm, email }
    }
  } catch {}

  return <HomeClient initialBattle={initialBattle} user={userInfo} />
}
