CREATE TABLE "app"."account_invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"role" "app"."account_role" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by_auth_subject_id" varchar(255),
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
