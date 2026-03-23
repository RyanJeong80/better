-- ============================================================
-- Winner System — Supabase SQL Editor에서 실행
-- https://supabase.com/dashboard/project/bdhgfivommfztnhrrtjc/sql/new
-- ============================================================

-- [1] betters에 winner 컬럼 추가
--     vote_choice enum('A','B') 재사용 — text+check 보다 타입 일관성 높음
ALTER TABLE betters
  ADD COLUMN IF NOT EXISTS winner vote_choice;

-- [2] closed_at 자동 설정 트리거
--     논리 수정: closed_at이 이미 명시적으로 설정된 경우 덮어쓰지 않음
CREATE OR REPLACE FUNCTION set_closed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.closed_at IS NULL THEN
    NEW.closed_at := NEW.created_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_better_closed_at ON betters;
CREATE TRIGGER set_better_closed_at
  BEFORE INSERT ON betters
  FOR EACH ROW EXECUTE FUNCTION set_closed_at();

-- [3] 기존 betters closed_at 일괄 설정 (NULL인 것만)
UPDATE betters
SET closed_at = created_at + INTERVAL '7 days'
WHERE closed_at IS NULL;

-- [4] winner 자동 확정 함수 (pg_cron 및 Edge Function에서 호출)
CREATE OR REPLACE FUNCTION close_expired_betters()
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  WITH vote_counts AS (
    SELECT
      better_id,
      COUNT(*) FILTER (WHERE choice = 'A') AS a_count,
      COUNT(*) FILTER (WHERE choice = 'B') AS b_count
    FROM votes
    GROUP BY better_id
  )
  UPDATE betters b
  SET winner = CASE
    WHEN vc.a_count > vc.b_count THEN 'A'::vote_choice
    WHEN vc.b_count > vc.a_count THEN 'B'::vote_choice
    ELSE NULL  -- 동률은 winner 미확정 유지
  END
  FROM vote_counts vc
  WHERE b.id = vc.better_id
    AND b.closed_at <= NOW()
    AND b.winner IS NULL
    AND (vc.a_count != vc.b_count);  -- 동률은 아예 UPDATE 안 함 (불필요한 쓰기 방지)

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [5] pg_cron으로 매일 자정 자동 실행 (Supabase에서 pg_cron 활성화 필요)
--     Supabase 대시보드 → Database → Extensions → pg_cron 활성화 후 실행

SELECT cron.schedule(
  'close-expired-betters',   -- job 이름
  '0 0 * * *',               -- 매일 00:00 UTC
  $$ SELECT close_expired_betters(); $$
);

-- 기존 job 있으면 교체 (이미 등록한 경우)
-- SELECT cron.unschedule('close-expired-betters');
-- 다시 위 SELECT cron.schedule(...) 실행

-- [6] 즉시 실행 (현재 만료된 betters winner 확정)
SELECT close_expired_betters();
