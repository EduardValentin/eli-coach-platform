CREATE TABLE "app"."coach_availability" (
	"id" smallint PRIMARY KEY NOT NULL,
	"time_zone" varchar(64) NOT NULL,
	"weekdays" varchar(9)[] NOT NULL,
	"start_hour" smallint NOT NULL,
	"end_hour" smallint NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coach_availability_is_singleton" CHECK ("app"."coach_availability"."id" = 1),
	CONSTRAINT "coach_availability_has_a_weekday" CHECK (cardinality("app"."coach_availability"."weekdays") >= 1),
	CONSTRAINT "coach_availability_hours_in_range" CHECK ("app"."coach_availability"."start_hour" >= 0 and "app"."coach_availability"."start_hour" < "app"."coach_availability"."end_hour" and "app"."coach_availability"."end_hour" <= 24)
);
--> statement-breakpoint
CREATE TABLE "app"."coach_meeting_room" (
	"id" smallint PRIMARY KEY NOT NULL,
	"url" text,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coach_meeting_room_is_singleton" CHECK ("app"."coach_meeting_room"."id" = 1)
);
