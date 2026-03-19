-- ============================================================
-- Supabase SQL Editor에서 직접 실행하는 마이그레이션 파일
-- https://supabase.com/dashboard/project/bdhgfivommfztnhrrtjc/sql/new
--
-- 실행 순서: 아래 블록을 순서대로 실행하거나, 전체를 한 번에 실행
-- ============================================================

-- [0001] users 테이블에 username 컬럼 추가
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");

-- [0002] betters 테이블에 category 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'better_category') THEN
    CREATE TYPE "public"."better_category" AS ENUM('fashion', 'appearance', 'decision');
  END IF;
END
$$;

ALTER TABLE "betters" ADD COLUMN IF NOT EXISTS "category" "better_category" DEFAULT 'decision' NOT NULL;
