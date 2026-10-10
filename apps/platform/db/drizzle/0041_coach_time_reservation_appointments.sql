ALTER TABLE "app"."coach_time_reservations" ADD COLUMN "assessment_call_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" ADD COLUMN "check_in_id" uuid;--> statement-breakpoint
UPDATE "app"."coach_time_reservations" SET "assessment_call_id" = "appointment_id" WHERE "appointment_kind" = 'assessment_call';--> statement-breakpoint
UPDATE "app"."coach_time_reservations" SET "check_in_id" = "appointment_id" WHERE "appointment_kind" = 'check_in';--> statement-breakpoint
DELETE FROM "app"."coach_time_reservations" AS "reservation"
  WHERE NOT EXISTS (SELECT 1 FROM "app"."assessment_calls" WHERE "id" = "reservation"."assessment_call_id")
    AND NOT EXISTS (SELECT 1 FROM "app"."check_ins" WHERE "id" = "reservation"."check_in_id");--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations"
  ADD CONSTRAINT "coach_time_reservations_assessment_call_id_assessment_calls_id_fk" FOREIGN KEY ("assessment_call_id")
  REFERENCES "app"."assessment_calls"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations"
  ADD CONSTRAINT "coach_time_reservations_check_in_id_check_ins_id_fk" FOREIGN KEY ("check_in_id")
  REFERENCES "app"."check_ins"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" ADD CONSTRAINT "coach_time_reservations_one_appointment" CHECK (num_nonnulls("app"."coach_time_reservations"."assessment_call_id", "app"."coach_time_reservations"."check_in_id") = 1);--> statement-breakpoint
CREATE UNIQUE INDEX "coach_time_reservations_assessment_call_unique" ON "app"."coach_time_reservations" USING btree ("assessment_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coach_time_reservations_check_in_unique" ON "app"."coach_time_reservations" USING btree ("check_in_id");--> statement-breakpoint
DROP INDEX "app"."coach_time_reservations_appointment_unique";--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" DROP COLUMN "appointment_kind";--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" DROP COLUMN "appointment_id";
