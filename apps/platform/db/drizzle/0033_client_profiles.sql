CREATE TABLE "app"."client_profiles" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(60) NOT NULL,
	"last_name" varchar(60) NOT NULL,
	"email" varchar(320) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" varchar(32) NOT NULL,
	"country" char(2) NOT NULL,
	"phone" varchar(16),
	"height_cm" numeric(4, 1),
	"starting_weight_kg" numeric(5, 2),
	"current_weight_kg" numeric(5, 2),
	"activity_level" text,
	"primary_goal" text,
	"dietary_restrictions" text NOT NULL,
	"client_notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "client_profiles_gender_check" CHECK ("app"."client_profiles"."gender" in ('female', 'male', 'prefer_not_to_say'))
);
--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;