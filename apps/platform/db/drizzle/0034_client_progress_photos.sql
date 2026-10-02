CREATE TABLE "app"."client_progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"view" varchar(8) NOT NULL,
	"storage_key" text NOT NULL,
	"key_id" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "client_progress_photos_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "client_progress_photos_entry_id_view_unique" UNIQUE("entry_id","view"),
	CONSTRAINT "client_progress_photos_view_check" CHECK ("app"."client_progress_photos"."view" in ('front', 'side', 'back'))
);
--> statement-breakpoint
ALTER TABLE "app"."client_profiles" ADD COLUMN "progress_photos_consented_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."client_progress_photos" ADD CONSTRAINT "client_progress_photos_entry_id_client_measurements_id_fk" FOREIGN KEY ("entry_id") REFERENCES "app"."client_measurements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."client_progress_photos" ADD CONSTRAINT "client_progress_photos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_progress_photos_client_id_idx" ON "app"."client_progress_photos" USING btree ("client_id");