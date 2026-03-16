import { getBattleById, getRandomBattle } from '@/actions/battles'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const initialBattle = id
    ? (await getBattleById(id)) ?? await getRandomBattle([])
    : await getRandomBattle([])

  return (
    <div className="mx-auto max-w-lg">
      <RandomBetterViewer initialBattle={initialBattle} isDemo={false} />
    </div>
  )
}
