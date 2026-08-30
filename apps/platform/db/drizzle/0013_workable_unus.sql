CREATE TABLE "app"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_subject_id" varchar(255) NOT NULL,
	"role" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "accounts_auth_subject_id_unique" UNIQUE("auth_subject_id"),
	CONSTRAINT "accounts_role_check" CHECK ("app"."accounts"."role" in ('USER', 'CLIENT', 'COACH'))
);
