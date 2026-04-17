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
CREATE TABLE "quiz_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"selected_option" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_answers_user_question_unique" UNIQUE("user_id","question_id")
);
