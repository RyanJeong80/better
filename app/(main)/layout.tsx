import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { createClient } from '@/lib/supabase/server'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let isLoggedIn = false
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    isLoggedIn = !!data.user
  } catch {}

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-12">
        {children}
      </main>
      <BottomNav isLoggedIn={isLoggedIn} />
    </div>
  )
}
