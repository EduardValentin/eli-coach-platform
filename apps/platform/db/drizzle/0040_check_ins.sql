CREATE TABLE "app"."check_ins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"client_time_zone" varchar(64) NOT NULL,
	"coach_time_zone" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"status" varchar(16) NOT NULL,
	"initiated_by" varchar(16) NOT NULL,
	"proposed_by" varchar(16) NOT NULL,
	"note" text,
	"requested_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "check_ins_kind_check" CHECK ("app"."check_ins"."kind" in ('ad_hoc')),
	CONSTRAINT "check_ins_status_check" CHECK ("app"."check_ins"."status" in ('pending', 'approved', 'cancelled')),
	CONSTRAINT "check_ins_initiated_by_check" CHECK ("app"."check_ins"."initiated_by" in ('client', 'coach')),
	CONSTRAINT "check_ins_proposed_by_check" CHECK ("app"."check_ins"."proposed_by" in ('client', 'coach')),
	CONSTRAINT "check_ins_note_length_check" CHECK ("app"."check_ins"."note" is null or char_length("app"."check_ins"."note") <= 500)
);
--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_ins_client_id_starts_at_idx" ON "app"."check_ins" USING btree ("client_id","starts_at");