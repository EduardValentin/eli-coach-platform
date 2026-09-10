ALTER TABLE "app"."store_recipients" DROP CONSTRAINT "store_recipients_account_id_accounts_id_fk";
--> statement-breakpoint
DROP INDEX "app"."store_recipients_account_idx";--> statement-breakpoint
ALTER TABLE "app"."store_recipients" DROP COLUMN "account_id";