ALTER TABLE "app"."waitlist_entries" ALTER COLUMN "pricing_eligibility" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD COLUMN "reduced_slot" integer;--> statement-breakpoint
UPDATE "app"."waitlist_entries" AS "entry"
SET "reduced_slot" = "numbered"."reduced_slot"
FROM (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "offer_slug"
      ORDER BY "created_at", "id"
    ) AS "reduced_slot"
  FROM "app"."waitlist_entries"
  WHERE "pricing_eligibility" = 'reduced'
) AS "numbered"
WHERE "entry"."id" = "numbered"."id";--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_offer_reduced_slot_unique" ON "app"."waitlist_entries" USING btree ("offer_slug","reduced_slot");--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD CONSTRAINT "waitlist_entries_reduced_slot_range" CHECK ("app"."waitlist_entries"."reduced_slot" between 1 and 10);--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD CONSTRAINT "waitlist_entries_reduced_slot_matches_pricing" CHECK (("app"."waitlist_entries"."pricing_eligibility" = 'reduced') = ("app"."waitlist_entries"."reduced_slot" is not null));