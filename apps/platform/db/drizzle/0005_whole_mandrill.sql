ALTER TABLE "app"."waitlist_entries" RENAME COLUMN "purpose" TO "pricing_eligibility";--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ALTER COLUMN "pricing_eligibility" SET DEFAULT 'reduced';--> statement-breakpoint
UPDATE "app"."waitlist_entries"
SET "pricing_eligibility" = CASE "pricing_eligibility"
  WHEN 'spot' THEN 'reduced'
  WHEN 'notification' THEN 'regular'
  ELSE "pricing_eligibility"
END;--> statement-breakpoint
DROP INDEX "app"."waitlist_entries_purpose_idx";--> statement-breakpoint
CREATE INDEX "waitlist_entries_pricing_eligibility_idx" ON "app"."waitlist_entries" USING btree ("pricing_eligibility");
