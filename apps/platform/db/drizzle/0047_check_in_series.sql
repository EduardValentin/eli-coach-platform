CREATE TABLE "app"."check_in_series" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"weekday" varchar(9) NOT NULL,
	"hour" smallint NOT NULL,
	"time_zone" varchar(64) NOT NULL,
	"covers_from" timestamp with time zone NOT NULL,
	"covers_until" timestamp with time zone NOT NULL,
	"set_up_at" timestamp with time zone NOT NULL,
	"changed_at" timestamp with time zone,
	"stopped_at" timestamp with time zone,
	CONSTRAINT "check_in_series_weekday_check" CHECK ("app"."check_in_series"."weekday" in ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
	CONSTRAINT "check_in_series_hour_check" CHECK ("app"."check_in_series"."hour" between 0 and 23)
);
--> statement-breakpoint
ALTER TABLE "app"."check_ins" DROP CONSTRAINT "check_ins_kind_check";--> statement-breakpoint
ALTER TABLE "app"."check_ins" DROP CONSTRAINT "check_ins_status_check";--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."check_in_series" ADD CONSTRAINT "check_in_series_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "app"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_series_active_per_client_unique" ON "app"."check_in_series" USING btree ("client_id") WHERE "app"."check_in_series"."stopped_at" is null;--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_series_id_check_in_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "app"."check_in_series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_ins_series_id_starts_at_idx" ON "app"."check_ins" USING btree ("series_id","starts_at");--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_kind_check" CHECK ("app"."check_ins"."kind" in ('ad_hoc', 'recurring'));--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_status_check" CHECK ("app"."check_ins"."status" in ('pending', 'approved', 'cancelled', 'clash'));