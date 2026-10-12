ALTER TABLE "app"."check_ins" ADD COLUMN "earlier_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD COLUMN "moves" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD COLUMN "new_time_note" text;--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_new_time_note_length_check" CHECK ("app"."check_ins"."new_time_note" is null or char_length("app"."check_ins"."new_time_note") <= 500);--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_moves_check" CHECK ("app"."check_ins"."moves" between 0 and 2);