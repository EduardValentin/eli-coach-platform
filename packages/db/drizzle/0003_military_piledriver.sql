CREATE TABLE "app"."waitlist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "waitlist_entries_created_at_idx" ON "app"."waitlist_entries" USING btree ("created_at");