ALTER TABLE "app"."clients" ADD COLUMN "review_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "details_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "details_answered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "answers_approved_at" timestamp with time zone;