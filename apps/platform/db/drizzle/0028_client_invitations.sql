CREATE TABLE "app"."client_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"accepted_by_auth_subject_id" varchar(255),
	"provider_invitation_id" varchar(255),
	"provider_invitation_url" text,
	"email_sent_at" timestamp with time zone,
	"email_delivery_failed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "client_invitations_token_hash_hex" CHECK ("app"."client_invitations"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "client_invitations_expires_after_sending" CHECK ("app"."client_invitations"."expires_at" > "app"."client_invitations"."sent_at"),
	CONSTRAINT "client_invitations_used_by_a_subject" CHECK (("app"."client_invitations"."used_at" is null) = ("app"."client_invitations"."accepted_by_auth_subject_id" is null)),
	CONSTRAINT "client_invitations_provider_complete" CHECK (("app"."client_invitations"."provider_invitation_id" is null) = ("app"."client_invitations"."provider_invitation_url" is null))
);
--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "auth_subject_id" varchar(255);--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "welcome_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."client_invitations" ADD CONSTRAINT "client_invitations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_invitations_client_id_unique" ON "app"."client_invitations" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_invitations_token_hash_unique" ON "app"."client_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_auth_subject_id_unique" ON "app"."clients" USING btree ("auth_subject_id");