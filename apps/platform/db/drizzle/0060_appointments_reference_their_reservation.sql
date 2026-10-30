ALTER TABLE "app"."coach_time_reservations" DROP CONSTRAINT "coach_time_reservations_one_appointment";--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" DROP CONSTRAINT "coach_time_reservations_assessment_call_id_assessment_calls_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" DROP CONSTRAINT "coach_time_reservations_check_in_id_check_ins_id_fk";
--> statement-breakpoint
DROP INDEX "app"."coach_time_reservations_assessment_call_unique";--> statement-breakpoint
DROP INDEX "app"."coach_time_reservations_check_in_unique";--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "reservation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD COLUMN "reservation_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD CONSTRAINT "assessment_calls_reservation_id_coach_time_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "app"."coach_time_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_reservation_id_coach_time_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "app"."coach_time_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" DROP COLUMN "assessment_call_id";--> statement-breakpoint
ALTER TABLE "app"."coach_time_reservations" DROP COLUMN "check_in_id";--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD CONSTRAINT "assessment_calls_reservation_id_unique" UNIQUE("reservation_id");--> statement-breakpoint
ALTER TABLE "app"."check_ins" ADD CONSTRAINT "check_ins_reservation_id_unique" UNIQUE("reservation_id");