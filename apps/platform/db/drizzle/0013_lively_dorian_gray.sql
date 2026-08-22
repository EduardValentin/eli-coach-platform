CREATE TABLE "app"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_subject_id" text,
	"role" varchar(16) DEFAULT 'USER' NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_role_check" CHECK ("app"."accounts"."role" in ('USER', 'CLIENT', 'COACH'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_auth_subject_id_unique" ON "app"."accounts" USING btree ("auth_subject_id");