import { getRandomBattle } from '@/actions/battles'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'

export default async function ExplorePage() {
  const initialBattle = await getRandomBattle([])

  return (
    <div className="mx-auto max-w-lg">
      <RandomBetterViewer initialBattle={initialBattle} isDemo={false} />
    </div>
  )
}
