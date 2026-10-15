ALTER TABLE "app"."clients" ADD COLUMN "coaching_program_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "coaching_paid_through" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "paid_through" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "program_starts_at" timestamp with time zone;--> statement-breakpoint
UPDATE "app"."coaching_subscriptions"
SET
  "paid_through" = ("paid_at" AT TIME ZONE 'UTC' + make_interval(months => "months")) AT TIME ZONE 'UTC',
  "program_starts_at" = CASE
    WHEN "start_choice" = 'waiting' THEN ("paid_at" AT TIME ZONE 'UTC' + interval '14 days') AT TIME ZONE 'UTC'
    ELSE "paid_at"
  END;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ALTER COLUMN "paid_through" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ALTER COLUMN "program_starts_at" SET NOT NULL;--> statement-breakpoint
UPDATE "app"."clients" AS "client"
SET
  "coaching_program_starts_at" = "latest"."program_starts_at",
  "coaching_paid_through" = "latest"."paid_through"
FROM (
  SELECT DISTINCT ON ("client_id")
    "client_id",
    "program_starts_at",
    "paid_through"
  FROM "app"."coaching_subscriptions"
  ORDER BY "client_id", "paid_at" DESC, "id" DESC
) AS "latest"
WHERE "latest"."client_id" = "client"."id";
