ALTER TABLE "app"."client_invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "app"."client_invitations" CASCADE;--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD COLUMN "token_hash" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD COLUMN "sent_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD COLUMN "provider_invitation_id" varchar(255);--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD COLUMN "provider_invitation_url" text;--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD COLUMN "email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD COLUMN "email_delivery_failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."clients" ADD COLUMN "account_invitation_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "account_invitations_token_hash_unique" ON "app"."account_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_account_invitation_id_unique" ON "app"."clients" USING btree ("account_invitation_id");--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD CONSTRAINT "account_invitations_token_hash_hex" CHECK ("app"."account_invitations"."token_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD CONSTRAINT "account_invitations_expires_after_sending" CHECK ("app"."account_invitations"."expires_at" > "app"."account_invitations"."sent_at");--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD CONSTRAINT "account_invitations_accepted_by_a_subject" CHECK (("app"."account_invitations"."accepted_at" is null) = ("app"."account_invitations"."accepted_by_auth_subject_id" is null));--> statement-breakpoint
ALTER TABLE "app"."account_invitations" ADD CONSTRAINT "account_invitations_provider_complete" CHECK (("app"."account_invitations"."provider_invitation_id" is null) = ("app"."account_invitations"."provider_invitation_url" is null));