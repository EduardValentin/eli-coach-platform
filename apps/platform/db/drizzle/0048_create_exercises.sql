CREATE TABLE "app"."exercises" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"form_cues" text NOT NULL,
	"type" varchar(16) NOT NULL,
	"unit" varchar(16) NOT NULL,
	"per_side" boolean NOT NULL,
	"difficulty" varchar(16) NOT NULL,
	"primary_muscles" text[] NOT NULL,
	"secondary_muscles" text[] NOT NULL,
	"equipment" text[] NOT NULL,
	"tags" text[] NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "exercises_type_check" CHECK ("app"."exercises"."type" in ('resistance', 'cardio', 'mobility', 'stretching', 'breathing')),
	CONSTRAINT "exercises_unit_check" CHECK ("app"."exercises"."unit" in ('reps', 'time', 'distance', 'breaths')),
	CONSTRAINT "exercises_difficulty_check" CHECK ("app"."exercises"."difficulty" in ('Beginner', 'Intermediate', 'Advanced'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_name_unique" ON "app"."exercises" USING btree (lower(btrim("name")));