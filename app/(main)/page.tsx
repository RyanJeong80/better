import { getRandomBattle } from '@/actions/battles'
import { createClient } from '@/lib/supabase/server'
import { HomeClient } from '@/components/home/home-client'

export default async function HomePage() {
  const initialBattle = await getRandomBattle([], undefined, { skipAuth: true }).catch(() => null)

  let isLoggedIn = false
  try {
    const supabase = await createClient()
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>(r =>
        setTimeout(() => r({ data: { user: null } }), 2000)
      ),
    ])
    isLoggedIn = !!data.user
  } catch {}

  return <HomeClient initialBattle={initialBattle} isLoggedIn={isLoggedIn} />
}
