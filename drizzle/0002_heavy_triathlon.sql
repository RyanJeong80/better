CREATE TYPE "public"."better_category" AS ENUM('fashion', 'appearance', 'decision');--> statement-breakpoint
ALTER TABLE "betters" ADD COLUMN "category" "better_category" DEFAULT 'decision' NOT NULL;