CREATE TYPE "app"."gender" AS ENUM('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');--> statement-breakpoint
CREATE TYPE "app"."activity_level" AS ENUM('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE');--> statement-breakpoint
CREATE TYPE "app"."goal_status" AS ENUM('ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "app"."goal_type" AS ENUM('MUSCLE_BUILDING', 'FAT_LOSS', 'STRENGTH', 'RECOMPOSITION', 'MAINTENANCE', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "app"."profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" "app"."gender" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."client_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" "app"."goal_type" NOT NULL,
	"status" "app"."goal_status" DEFAULT 'ACTIVE' NOT NULL,
	"target_weight_kg" numeric(5, 1) NOT NULL,
	"started_on" date NOT NULL,
	"ended_on" date
);
--> statement-breakpoint
CREATE TABLE "app"."client_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"payload_digest" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."client_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"height_cm" numeric(5, 1) NOT NULL,
	"weight_kg" numeric(5, 1) NOT NULL,
	"activity_level" "app"."activity_level" NOT NULL,
	"basal_metabolic_rate" integer NOT NULL,
	"total_daily_energy_expenditure" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"normalized_email" varchar(320) NOT NULL,
	"dietary_restrictions" varchar(2000),
	"coach_notes" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."nutrition_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"daily_calories" integer NOT NULL,
	"protein_percent" integer NOT NULL,
	"carbs_percent" integer NOT NULL,
	"fats_percent" integer NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."profiles" ADD CONSTRAINT "profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "app"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_goals" ADD CONSTRAINT "client_goals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_invitations" ADD CONSTRAINT "client_invitations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_measurements" ADD CONSTRAINT "client_measurements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD CONSTRAINT "clients_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "app"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."nutrition_targets" ADD CONSTRAINT "nutrition_targets_goal_id_client_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "app"."client_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_account_id_unique" ON "app"."profiles" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_goals_one_active_per_client" ON "app"."client_goals" USING btree ("client_id") WHERE "app"."client_goals"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "client_invitations_idempotency_key_unique" ON "app"."client_invitations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "client_invitations_one_pending_per_client" ON "app"."client_invitations" USING btree ("client_id") WHERE "app"."client_invitations"."accepted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "client_measurements_client_recorded_at_unique" ON "app"."client_measurements" USING btree ("client_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_normalized_email_unique" ON "app"."clients" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_profile_id_unique" ON "app"."clients" USING btree ("profile_id");