CREATE TABLE "assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"position" smallint NOT NULL,
	"shown_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"choice" smallint,
	"response_ms" integer,
	CONSTRAINT "assessment_responses_session_position_unique" UNIQUE("session_id","position")
);
--> statement-breakpoint
CREATE TABLE "assessment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"grade_band" text,
	"engine_version" text NOT NULL,
	"posterior" jsonb NOT NULL,
	"result" jsonb,
	"inconsistency" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_user_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"onet_id" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"interests_snapshot" text[] NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"engine_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"interest" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_interests_user_interest_unique" UNIQUE("user_id","interest")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"grade_band" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_responses_item_idx" ON "assessment_responses" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_user_started_idx" ON "assessment_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_sessions_one_active_per_user" ON "assessment_sessions" USING btree ("user_id") WHERE "assessment_sessions"."completed_at" IS NULL AND "assessment_sessions"."abandoned_at" IS NULL;--> statement-breakpoint
CREATE INDEX "career_user_actions_user_onet_idx" ON "career_user_actions" USING btree ("user_id","onet_id");--> statement-breakpoint
CREATE INDEX "career_user_actions_user_action_idx" ON "career_user_actions" USING btree ("user_id","action","created_at");--> statement-breakpoint
CREATE INDEX "recommendation_runs_user_created_idx" ON "recommendation_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_interests_user_idx" ON "user_interests" USING btree ("user_id");