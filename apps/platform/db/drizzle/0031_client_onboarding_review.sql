CREATE TABLE "app"."client_onboarding_detail_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"question_ids" jsonb NOT NULL,
	"note" text NOT NULL,
	"asked_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."client_onboarding_reviews" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"opened_at" timestamp with time zone,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."client_onboarding_detail_requests" ADD CONSTRAINT "client_onboarding_detail_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_onboarding_reviews" ADD CONSTRAINT "client_onboarding_reviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_onboarding_detail_requests_client_id_asked_at_idx" ON "app"."client_onboarding_detail_requests" USING btree ("client_id","asked_at");