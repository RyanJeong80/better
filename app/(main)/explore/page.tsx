import { getRandomBattle } from '@/actions/battles'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'

export default async function ExplorePage() {
  const isDemo =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')

  const initialBattle = await getRandomBattle([])

  return (
    <div className="mx-auto max-w-lg">
      <RandomBetterViewer initialBattle={initialBattle} isDemo={isDemo} />
    </div>
  )
}
