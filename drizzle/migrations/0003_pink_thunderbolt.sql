DROP TABLE IF EXISTS "quiz_answers";--> statement-breakpoint
DROP TABLE IF EXISTS "career_recommendations";--> statement-breakpoint
CREATE TABLE "career_recommendations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL REFERENCES "recommendation_runs"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "rank" smallint NOT NULL,
  "onet_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "why_it_matches" text NOT NULL,
  "job_growth" text,
  "salary_range" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "career_recommendations_user_run_idx" ON "career_recommendations" ("user_id", "run_id");
