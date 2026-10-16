CREATE TABLE "app"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_party" varchar(6) NOT NULL,
	"recipient_client_id" uuid,
	"kind" varchar(64) NOT NULL,
	"facts" jsonb NOT NULL,
	"arrived_at" timestamp with time zone NOT NULL,
	"read_at" timestamp with time zone,
	"once_key" varchar(160),
	CONSTRAINT "notifications_recipient_check" CHECK (("app"."notifications"."recipient_party" = 'coach' and "app"."notifications"."recipient_client_id" is null) or ("app"."notifications"."recipient_party" = 'client' and "app"."notifications"."recipient_client_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."notifications" ADD CONSTRAINT "notifications_recipient_client_id_clients_id_fk" FOREIGN KEY ("recipient_client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_arrived_idx" ON "app"."notifications" USING btree ("recipient_party","recipient_client_id","arrived_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "app"."notifications" USING btree ("recipient_party","recipient_client_id") WHERE "app"."notifications"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_once_key_unique" ON "app"."notifications" USING btree ("once_key") WHERE "app"."notifications"."once_key" is not null;