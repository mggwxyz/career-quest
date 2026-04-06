CREATE TABLE "career_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"onet_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"why_it_matches" text NOT NULL,
	"job_growth" text NOT NULL,
	"salary_range" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "career_recommendations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quiz_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"selected_option" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_answers_user_question_unique" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "quiz_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT auth.uid() NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"interests" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "career_recommendations_select" ON "career_recommendations" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "career_recommendations_insert" ON "career_recommendations" AS PERMISSIVE FOR INSERT TO "anon", "authenticated" WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "career_recommendations_update" ON "career_recommendations" AS PERMISSIVE FOR UPDATE TO "anon", "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "career_recommendations_delete" ON "career_recommendations" AS PERMISSIVE FOR DELETE TO "anon", "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "quiz_answers_select" ON "quiz_answers" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (auth.uid() = "quiz_answers"."user_id");--> statement-breakpoint
CREATE POLICY "quiz_answers_insert" ON "quiz_answers" AS PERMISSIVE FOR INSERT TO "anon", "authenticated" WITH CHECK (auth.uid() = "quiz_answers"."user_id");--> statement-breakpoint
CREATE POLICY "quiz_answers_update" ON "quiz_answers" AS PERMISSIVE FOR UPDATE TO "anon", "authenticated" USING (auth.uid() = "quiz_answers"."user_id");--> statement-breakpoint
CREATE POLICY "users_select" ON "users" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "users_insert" ON "users" AS PERMISSIVE FOR INSERT TO "anon", "authenticated" WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "users_update" ON "users" AS PERMISSIVE FOR UPDATE TO "anon", "authenticated" USING (auth.uid() = id);