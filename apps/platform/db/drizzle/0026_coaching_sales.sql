CREATE TABLE "app"."checkout_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payment_link_id" uuid NOT NULL,
	"bundle_id" varchar(16) NOT NULL,
	"tier" varchar(16) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"start_choice" varchar(16) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expired_at" timestamp with time zone,
	CONSTRAINT "checkout_sessions_bundle_id_check" CHECK ("app"."checkout_sessions"."bundle_id" in ('1-month', '3-months', '6-months')),
	CONSTRAINT "checkout_sessions_tier_check" CHECK ("app"."checkout_sessions"."tier" in ('regular', 'reduced')),
	CONSTRAINT "checkout_sessions_start_choice_check" CHECK ("app"."checkout_sessions"."start_choice" in ('immediate', 'waiting')),
	CONSTRAINT "checkout_sessions_amount_cents_positive" CHECK ("app"."checkout_sessions"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_call_id" uuid NOT NULL,
	"first_name" varchar(60) NOT NULL,
	"last_name" varchar(60) NOT NULL,
	"email" varchar(320) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" varchar(32) NOT NULL,
	"primary_goal" varchar(32) NOT NULL,
	"country" char(2) NOT NULL,
	"phone" varchar(16),
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "clients_gender_check" CHECK ("app"."clients"."gender" in ('female', 'male', 'prefer_not_to_say')),
	CONSTRAINT "clients_primary_goal_check" CHECK ("app"."clients"."primary_goal" in ('lose_weight', 'build_muscle', 'build_strength', 'maintain_improve_lifestyle'))
);
--> statement-breakpoint
CREATE TABLE "app"."coaching_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"assessment_call_id" uuid NOT NULL,
	"bundle_id" varchar(16) NOT NULL,
	"months" integer NOT NULL,
	"tier" varchar(16) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"stripe_checkout_session_id" varchar(255) NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"start_choice" varchar(16) NOT NULL,
	"status" varchar(16) DEFAULT 'not-started' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coaching_subscriptions_bundle_id_check" CHECK ("app"."coaching_subscriptions"."bundle_id" in ('1-month', '3-months', '6-months')),
	CONSTRAINT "coaching_subscriptions_tier_check" CHECK ("app"."coaching_subscriptions"."tier" in ('regular', 'reduced')),
	CONSTRAINT "coaching_subscriptions_start_choice_check" CHECK ("app"."coaching_subscriptions"."start_choice" in ('immediate', 'waiting')),
	CONSTRAINT "coaching_subscriptions_amount_cents_positive" CHECK ("app"."coaching_subscriptions"."amount_cents" > 0),
	CONSTRAINT "coaching_subscriptions_months_check" CHECK ("app"."coaching_subscriptions"."months" in (1, 3, 6)),
	CONSTRAINT "coaching_subscriptions_status_check" CHECK ("app"."coaching_subscriptions"."status" in ('not-started'))
);
--> statement-breakpoint
CREATE TABLE "app"."payment_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payment_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_call_id" uuid NOT NULL,
	"token_sha256" varchar(64) NOT NULL,
	"state" varchar(16) DEFAULT 'valid' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"stripe_customer_id" varchar(255),
	CONSTRAINT "payment_links_token_sha256_hex" CHECK ("app"."payment_links"."token_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "payment_links_state_check" CHECK ("app"."payment_links"."state" in ('valid', 'voided', 'spent')),
	CONSTRAINT "payment_links_expires_after_creation" CHECK ("app"."payment_links"."expires_at" > "app"."payment_links"."created_at")
);
--> statement-breakpoint
ALTER TABLE "app"."checkout_sessions" ADD CONSTRAINT "checkout_sessions_payment_link_id_payment_links_id_fk" FOREIGN KEY ("payment_link_id") REFERENCES "app"."payment_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD CONSTRAINT "clients_assessment_call_id_assessment_calls_id_fk" FOREIGN KEY ("assessment_call_id") REFERENCES "app"."assessment_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD CONSTRAINT "coaching_subscriptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD CONSTRAINT "coaching_subscriptions_assessment_call_id_assessment_calls_id_fk" FOREIGN KEY ("assessment_call_id") REFERENCES "app"."assessment_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_links" ADD CONSTRAINT "payment_links_assessment_call_id_assessment_calls_id_fk" FOREIGN KEY ("assessment_call_id") REFERENCES "app"."assessment_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_sessions_payment_link_id_idx" ON "app"."checkout_sessions" USING btree ("payment_link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_assessment_call_id_unique" ON "app"."clients" USING btree ("assessment_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coaching_subscriptions_client_id_unique" ON "app"."coaching_subscriptions" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coaching_subscriptions_stripe_subscription_id_unique" ON "app"."coaching_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coaching_subscriptions_stripe_checkout_session_id_unique" ON "app"."coaching_subscriptions" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "coaching_subscriptions_assessment_call_id_idx" ON "app"."coaching_subscriptions" USING btree ("assessment_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_token_sha256_unique" ON "app"."payment_links" USING btree ("token_sha256");--> statement-breakpoint
CREATE INDEX "payment_links_assessment_call_id_idx" ON "app"."payment_links" USING btree ("assessment_call_id");