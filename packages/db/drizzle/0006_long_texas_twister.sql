ALTER TABLE "app"."waitlist_entries" DROP CONSTRAINT "waitlist_entries_email_unique";--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD COLUMN "offer_slug" varchar(96) DEFAULT '12-months-launch-1' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD COLUMN "offer_plan" varchar(32) DEFAULT '12-months' NOT NULL;--> statement-breakpoint
CREATE INDEX "waitlist_entries_offer_slug_idx" ON "app"."waitlist_entries" USING btree ("offer_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_email_offer_unique" ON "app"."waitlist_entries" USING btree ("email","offer_slug");