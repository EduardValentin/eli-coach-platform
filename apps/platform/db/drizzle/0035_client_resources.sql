CREATE TABLE "app"."client_resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"original_name" text NOT NULL,
	"format" varchar(8) NOT NULL,
	"size_bytes" integer NOT NULL,
	"page_count" integer,
	"added_at" timestamp with time zone NOT NULL,
	CONSTRAINT "client_resources_format_check" CHECK ("app"."client_resources"."format" in ('pdf', 'jpeg', 'png', 'webp', 'docx', 'doc', 'odt', 'xlsx', 'xls', 'ods')),
	CONSTRAINT "client_resources_page_count_check" CHECK ("app"."client_resources"."page_count" is null or "app"."client_resources"."page_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "app"."client_resources" ADD CONSTRAINT "client_resources_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_resources_client_id_added_at_idx" ON "app"."client_resources" USING btree ("client_id","added_at" DESC NULLS LAST);