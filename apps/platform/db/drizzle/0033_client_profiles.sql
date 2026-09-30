CREATE TABLE "app"."client_profiles" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"height_cm" numeric(4, 1),
	"activity_level" text,
	"primary_goal" text,
	"dietary_restrictions" text NOT NULL,
	"client_notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD CONSTRAINT "client_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;