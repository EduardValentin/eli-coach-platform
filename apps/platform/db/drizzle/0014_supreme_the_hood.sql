CREATE TYPE "app"."account_role" AS ENUM('USER', 'CLIENT', 'COACH');--> statement-breakpoint
ALTER TABLE "app"."accounts" DROP CONSTRAINT "accounts_role_check";--> statement-breakpoint
ALTER TABLE "app"."accounts" ALTER COLUMN "role" SET DATA TYPE "app"."account_role" USING "role"::"app"."account_role";