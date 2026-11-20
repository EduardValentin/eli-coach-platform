CREATE TABLE "app"."program_versions" (
	"program_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"status" varchar(16) NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "program_versions_program_id_number_pk" PRIMARY KEY("program_id","number"),
	CONSTRAINT "program_versions_number_check" CHECK ("app"."program_versions"."number" >= 1),
	CONSTRAINT "program_versions_status_check" CHECK ("app"."program_versions"."status" in ('draft', 'published', 'superseded')),
	CONSTRAINT "program_versions_content_check" CHECK (jsonb_typeof("app"."program_versions"."content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "app"."programs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"goal" text NOT NULL,
	"level" varchar(16) NOT NULL,
	"language" varchar(2) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "programs_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "programs_goal_check" CHECK ("app"."programs"."goal" = btrim("app"."programs"."goal") and "app"."programs"."goal" <> ''),
	CONSTRAINT "programs_level_check" CHECK ("app"."programs"."level" in ('beginner', 'intermediate', 'advanced')),
	CONSTRAINT "programs_language_check" CHECK ("app"."programs"."language" in ('en', 'ro'))
);
--> statement-breakpoint
ALTER TABLE "app"."program_versions" ADD CONSTRAINT "program_versions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "app"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."programs" ADD CONSTRAINT "programs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "program_versions_draft_per_program_unique" ON "app"."program_versions" USING btree ("program_id") WHERE "app"."program_versions"."status" = 'draft';