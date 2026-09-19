CREATE TABLE "app"."assessment_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_name" varchar(120) NOT NULL,
	"visitor_email" varchar(320) NOT NULL,
	"visitor_notes" text,
	"starts_at" timestamp with time zone NOT NULL,
	"visitor_time_zone" varchar(64) NOT NULL,
	"coach_time_zone" varchar(64) NOT NULL,
	"booked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_calls_starts_at_unique" ON "app"."assessment_calls" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "assessment_calls_visitor_email_starts_at_idx" ON "app"."assessment_calls" USING btree ("visitor_email","starts_at");