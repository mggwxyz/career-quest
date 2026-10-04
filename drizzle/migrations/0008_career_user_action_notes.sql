ALTER TABLE "career_user_actions" ADD COLUMN "note" text;--> statement-breakpoint
COMMENT ON COLUMN "career_user_actions"."action" IS 'Append-only career event. Allowed values: save, unsave, shortlist, unshortlist, dismiss, undismiss, view, chat, note.';--> statement-breakpoint
COMMENT ON COLUMN "career_user_actions"."note" IS 'Optional user note payload when action = note.';--> statement-breakpoint
CREATE INDEX "career_user_actions_user_created_idx" ON "career_user_actions" USING btree ("user_id","created_at");
