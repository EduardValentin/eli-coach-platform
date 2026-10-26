CREATE TABLE "app"."client_avatars" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"avatar_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"key_id" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "client_avatars_avatar_id_unique" UNIQUE("avatar_id"),
	CONSTRAINT "client_avatars_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "app"."client_settings" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"weight_unit" varchar(8) NOT NULL,
	"height_unit" varchar(8) NOT NULL,
	"preferred_check_in_weekday" varchar(9),
	"preferred_channel" varchar(8),
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "client_settings_weight_unit_check" CHECK ("app"."client_settings"."weight_unit" in ('kg', 'lb')),
	CONSTRAINT "client_settings_height_unit_check" CHECK ("app"."client_settings"."height_unit" in ('cm', 'ft-in')),
	CONSTRAINT "client_settings_preferred_check_in_weekday_check" CHECK ("app"."client_settings"."preferred_check_in_weekday" in ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
	CONSTRAINT "client_settings_preferred_channel_check" CHECK ("app"."client_settings"."preferred_channel" in ('email', 'whatsapp'))
);
--> statement-breakpoint
ALTER TABLE "app"."client_unit_preferences" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "app"."client_unit_preferences" CASCADE;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ALTER COLUMN "activity_level" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ALTER COLUMN "dietary_restrictions" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "training_days_per_week" smallint;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "session_minutes" smallint;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "equipment" jsonb;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "training_place" varchar(8);--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "limitations" text;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "level" varchar(16);--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "goal_weight_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "cycle_mode" varchar(16);--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "coach_notes" text;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "coaching_seeded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."client_avatars" ADD CONSTRAINT "client_avatars_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_settings" ADD CONSTRAINT "client_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_profiles" DROP COLUMN "client_notes";--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_training_days_per_week_check" CHECK ("app"."client_profiles"."training_days_per_week" in (2, 3, 4, 5));--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_session_minutes_check" CHECK ("app"."client_profiles"."session_minutes" in (30, 45, 60));--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_training_place_check" CHECK ("app"."client_profiles"."training_place" in ('Home', 'Gym', 'Both'));--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_level_check" CHECK ("app"."client_profiles"."level" in ('beginner', 'intermediate', 'advanced'));--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_activity_level_check" CHECK ("app"."client_profiles"."activity_level" in ('Mostly sitting', 'Lightly active', 'Active', 'Very active'));--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_cycle_mode_check" CHECK ("app"."client_profiles"."cycle_mode" in ('adapted', 'general'));--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_primary_goal_check" CHECK ("app"."client_profiles"."primary_goal" in ('Lose fat', 'Build muscle', 'Maintain a healthy weight', 'Learn to balance activity and nutrition', 'Improve overall health', 'Work with my menstrual cycle'));
