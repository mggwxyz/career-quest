CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE "onet_occupations" (
  "code" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "job_zone" integer NOT NULL,
  "bright_outlook" boolean NOT NULL DEFAULT false,
  "riasec_primary" char(1),
  "riasec_all" text[] NOT NULL DEFAULT '{}',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "onet_occupations_slug_unique" UNIQUE("slug")
);

CREATE INDEX "onet_occupations_job_zone_idx" ON "onet_occupations" ("job_zone");
CREATE INDEX "onet_occupations_bright_idx" ON "onet_occupations" ("bright_outlook") WHERE "bright_outlook";
CREATE INDEX "onet_occupations_riasec_idx" ON "onet_occupations" USING gin ("riasec_all");
CREATE INDEX "onet_occupations_title_trgm" ON "onet_occupations" USING gin ("title" gin_trgm_ops);

ALTER TABLE "career_recommendations" ADD COLUMN "slug" text;
