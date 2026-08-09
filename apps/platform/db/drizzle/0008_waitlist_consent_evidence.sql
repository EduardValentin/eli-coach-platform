DELETE FROM "app"."waitlist_entries";--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD COLUMN "privacy_policy_version" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD COLUMN "marketing_consent_version" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD COLUMN "marketing_consented_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."waitlist_entries" ADD COLUMN "updated_at" timestamp with time zone NOT NULL;
