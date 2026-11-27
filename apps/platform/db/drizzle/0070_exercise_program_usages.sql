CREATE TABLE "app"."exercise_program_usages" (
	"exercise_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	CONSTRAINT "exercise_program_usages_program_id_version_number_exercise_id_pk" PRIMARY KEY("program_id","version_number","exercise_id")
);
--> statement-breakpoint
ALTER TABLE "app"."exercise_program_usages" ADD CONSTRAINT "exercise_program_usages_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "app"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_program_usages_exercise_idx" ON "app"."exercise_program_usages" USING btree ("exercise_id");