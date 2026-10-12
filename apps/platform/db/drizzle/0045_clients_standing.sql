ALTER TABLE "app"."clients" ADD COLUMN "booking_time_zone" varchar(64);--> statement-breakpoint
UPDATE "app"."clients" AS "client"
SET "booking_time_zone" = "call"."visitor_time_zone"
FROM "app"."assessment_calls" AS "call"
WHERE "call"."id" = "client"."assessment_call_id";--> statement-breakpoint
ALTER TABLE "app"."clients" ALTER COLUMN "booking_time_zone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "coaching_status" varchar(16) DEFAULT 'not-started' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "coaching_access_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "coaching_refund_due" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "coaching_bundle_months" smallint;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD CONSTRAINT "clients_coaching_status_check" CHECK ("app"."clients"."coaching_status" in ('not-started', 'active', 'cancelled', 'ended'));--> statement-breakpoint
UPDATE "app"."clients" AS "client"
SET
  "coaching_status" = "latest"."status",
  "coaching_access_ends_at" = "latest"."access_ends_at",
  "coaching_refund_due" = coalesce("latest"."refund_due_cents" - "latest"."refunded_cents", 0) > 0,
  "coaching_bundle_months" = "latest"."months"
FROM (
  SELECT DISTINCT ON ("client_id")
    "client_id",
    "status",
    "access_ends_at",
    "refund_due_cents",
    "refunded_cents",
    "months"
  FROM "app"."coaching_subscriptions"
  ORDER BY "client_id", "paid_at" DESC, "id" DESC
) AS "latest"
WHERE "latest"."client_id" = "client"."id";
