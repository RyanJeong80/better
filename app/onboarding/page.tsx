import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UsernameForm } from '@/components/onboarding/username-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 이미 username이 있으면 홈으로
  if (user.user_metadata?.username) redirect('/')

  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email

  return (
    <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mb-2 text-3xl">👋</div>
        <h1 className="text-xl font-black text-gray-900">어서오세요!</h1>
        {displayName && (
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{displayName}</span>님,
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Better에서 사용할 닉네임을 설정해주세요.
        </p>
      </div>

      <UsernameForm />
    </div>
  )
}
