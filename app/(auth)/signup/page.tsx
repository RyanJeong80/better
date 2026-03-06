import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* 배경 그라디언트 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.9 0.05 264 / 0.3), transparent)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* 브랜드 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight">Better</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            어떤 게 더 나은지, 사람들에게 물어보세요
          </p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold">회원가입</h2>
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
