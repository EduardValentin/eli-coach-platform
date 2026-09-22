DELETE FROM "app"."coach_time_reservations" WHERE "appointment_kind" = 'assessment_call';--> statement-breakpoint
DELETE FROM "app"."assessment_calls";--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "first_name" varchar(60) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "last_name" varchar(60) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "date_of_birth" date NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "gender" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "primary_goal" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "country" char(2) NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD COLUMN "phone" varchar(16);--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" DROP COLUMN "visitor_name";--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD CONSTRAINT "assessment_calls_gender_check" CHECK ("app"."assessment_calls"."gender" in ('female', 'male', 'prefer_not_to_say'));--> statement-breakpoint
ALTER TABLE "app"."assessment_calls" ADD CONSTRAINT "assessment_calls_primary_goal_check" CHECK ("app"."assessment_calls"."primary_goal" in ('lose_weight', 'build_muscle', 'build_strength', 'maintain_improve_lifestyle'));