import { getBattleById, getRandomBattle } from '@/actions/battles'
import { RandomBetterViewer } from '@/components/battles/random-better-viewer'
import type { CategoryFilter } from '@/lib/constants/categories'
import { CATEGORY_FILTERS } from '@/lib/constants/categories'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; category?: string }>
}) {
  const { id, category } = await searchParams
  const initialCategory: CategoryFilter =
    (CATEGORY_FILTERS.find((f) => f.id === category)?.id) ?? 'all'
  const cat = initialCategory !== 'all' ? initialCategory : undefined

  const initialBattle = id
    ? (await getBattleById(id)) ?? await getRandomBattle([], cat)
    : await getRandomBattle([], cat)

  return (
    <div className="mx-auto max-w-lg">
      <RandomBetterViewer
        initialBattle={initialBattle}
        initialCategory={initialCategory}
        isDemo={false}
      />
    </div>
  )
}
