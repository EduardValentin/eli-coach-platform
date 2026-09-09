ALTER TABLE "app"."accounts" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "app"."account_role";--> statement-breakpoint
CREATE TYPE "app"."account_role" AS ENUM('CLIENT', 'COACH');--> statement-breakpoint
ALTER TABLE "app"."accounts" ALTER COLUMN "role" SET DATA TYPE "app"."account_role" USING "role"::"app"."account_role";