import { CreateBattleForm } from '@/components/battles/create-battle-form'

export default function NewBattlePage() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">새 Better 만들기</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          두 사진을 올리고 사람들에게 선택을 받아보세요
        </p>
      </div>

      <CreateBattleForm />
    </div>
  )
}
