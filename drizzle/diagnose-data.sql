-- ============================================================
-- 데이터 진단 쿼리 — Supabase SQL Editor에서 실행
-- https://supabase.com/dashboard/project/bdhgfivommfztnhrrtjc/sql/new
-- ============================================================

-- 1. 각 테이블 row 수 확인
SELECT 'betters' AS table_name, COUNT(*) AS row_count FROM betters
UNION ALL
SELECT 'votes',                  COUNT(*)            FROM votes
UNION ALL
SELECT 'likes',                  COUNT(*)            FROM likes
UNION ALL
SELECT 'users',                  COUNT(*)            FROM users;

-- 2. betters 최근 5개 확인 (데이터가 있다면 내용 출력)
SELECT id, title, category, created_at
FROM betters
ORDER BY created_at DESC
LIMIT 5;

-- 3. category 컬럼이 실제로 존재하는지 확인
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'betters'
ORDER BY ordinal_position;

-- 4. better_category 타입이 존재하는지 확인
SELECT typname, typtype
FROM pg_type
WHERE typname = 'better_category';

-- 5. category 값 분포 확인 (데이터 있는 경우)
SELECT category, COUNT(*) FROM betters GROUP BY category;
