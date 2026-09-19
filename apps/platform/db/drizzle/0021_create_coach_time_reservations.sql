CREATE TABLE "app"."coach_time_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"appointment_kind" varchar(32) NOT NULL,
	"appointment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_time_reservations_ends_after_start" CHECK ("app"."coach_time_reservations"."ends_at" > "app"."coach_time_reservations"."starts_at")
);
--> statement-breakpoint
DROP INDEX "app"."assessment_calls_starts_at_unique";