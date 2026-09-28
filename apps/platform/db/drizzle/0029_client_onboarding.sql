CREATE TABLE "app"."client_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"waist_cm" numeric(4, 1) NOT NULL,
	"hips_cm" numeric(4, 1),
	"thigh_cm" numeric(4, 1),
	"arm_cm" numeric(4, 1)
);
--> statement-breakpoint
CREATE TABLE "app"."client_onboarding_drafts" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"answers" jsonb NOT NULL,
	"current_form_index" integer NOT NULL,
	"special_category_consented_at" timestamp with time zone,
	"disclaimer_consented_at" timestamp with time zone,
	"progress_photos_consented_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."client_onboarding_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"special_category_consented_at" timestamp with time zone,
	"disclaimer_consented_at" timestamp with time zone,
	"progress_photos_consented_at" timestamp with time zone,
	"submitted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."client_unit_preferences" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"weight_unit" varchar(8) NOT NULL,
	"height_unit" varchar(8) NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "client_unit_preferences_weight_unit_check" CHECK ("app"."client_unit_preferences"."weight_unit" in ('kg', 'lb')),
	CONSTRAINT "client_unit_preferences_height_unit_check" CHECK ("app"."client_unit_preferences"."height_unit" in ('cm', 'ft-in'))
);
--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "onboarding_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."client_measurements" ADD CONSTRAINT "client_measurements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_onboarding_drafts" ADD CONSTRAINT "client_onboarding_drafts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_onboarding_submissions" ADD CONSTRAINT "client_onboarding_submissions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_unit_preferences" ADD CONSTRAINT "client_unit_preferences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_measurements_client_id_recorded_at_idx" ON "app"."client_measurements" USING btree ("client_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_onboarding_submissions_client_id_unique" ON "app"."client_onboarding_submissions" USING btree ("client_id");