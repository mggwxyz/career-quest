CREATE TABLE "app_error_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"severity" text DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"name" text,
	"stack" text,
	"digest" text,
	"route" text,
	"method" text,
	"user_id" text,
	"user_agent" text,
	"component_stack" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "app_error_events_created_idx" ON "app_error_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_error_events_source_created_idx" ON "app_error_events" USING btree ("source","created_at");--> statement-breakpoint
CREATE INDEX "app_error_events_route_created_idx" ON "app_error_events" USING btree ("route","created_at");--> statement-breakpoint
CREATE INDEX "app_error_events_user_created_idx" ON "app_error_events" USING btree ("user_id","created_at");