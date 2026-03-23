/**
 * close-betters Edge Function
 *
 * 만료된 betters의 winner를 다수결로 확정합니다.
 * close_expired_betters() PostgreSQL 함수를 RPC로 호출합니다.
 *
 * 배포 방법:
 *   1. Supabase CLI 설치: npm install -g supabase
 *   2. 로그인: supabase login
 *   3. 프로젝트 연결: supabase link --project-ref bdhgfivommfztnhrrtjc
 *   4. 배포: supabase functions deploy close-betters
 *
 * Cron 설정 (pg_cron 방식 — 권장):
 *   drizzle/0003_winner_system.sql의 [5]번 실행으로 설정됩니다.
 *   Edge Function 방식이 필요한 경우에만 아래 webhook 방식을 사용하세요.
 *
 * Edge Function Cron 방식:
 *   Supabase 대시보드 → Edge Functions → close-betters → Schedule
 *   Cron 표현식: 0 0 * * *  (매일 UTC 00:00)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 서비스 롤 키로만 호출 가능 (Authorization 헤더 검증)
  const authHeader = req.headers.get('Authorization')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    // Supabase 내부 cron 호출은 자동으로 service_role로 실행되므로 허용
    const isInternalCall = req.headers.get('x-supabase-func-source') === 'cron'
    if (!isInternalCall) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // close_expired_betters() PostgreSQL 함수 호출
  const { data, error } = await supabase.rpc('close_expired_betters')

  if (error) {
    console.error('close_expired_betters error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const updatedCount = data as number
  console.log(`Winner confirmed: ${updatedCount} betters`)

  return new Response(
    JSON.stringify({ ok: true, updated: updatedCount }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
