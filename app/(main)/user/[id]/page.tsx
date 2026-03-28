import { createClient } from '@/lib/supabase/server'
import { UserProfilePageClient } from '@/components/profile/user-profile-page-client'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let viewerUserId: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    viewerUserId = data.user?.id ?? null
  } catch {}

  return <UserProfilePageClient userId={id} viewerUserId={viewerUserId} />
}
