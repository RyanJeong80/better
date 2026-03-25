import { getTranslations } from 'next-intl/server'
import { CreateBattleForm } from '@/components/battles/create-battle-form'

export default async function NewBattlePage() {
  const t = await getTranslations('create')

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{t('newTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <CreateBattleForm />
    </div>
  )
}
