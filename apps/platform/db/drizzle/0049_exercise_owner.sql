DROP INDEX "app"."exercises_name_unique";--> statement-breakpoint
ALTER TABLE "app"."exercises" ADD COLUMN "owner_account_id" uuid;--> statement-breakpoint
UPDATE "app"."exercises" SET "owner_account_id" = (SELECT "id" FROM "app"."accounts" WHERE "role" = 'COACH' AND "deleted_at" IS NULL ORDER BY "created_at", "id" LIMIT 1);--> statement-breakpoint
DELETE FROM "app"."exercises" WHERE "owner_account_id" IS NULL;--> statement-breakpoint
ALTER TABLE "app"."exercises" ALTER COLUMN "owner_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."exercises" ADD CONSTRAINT "exercises_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "app"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_owner_name_unique" ON "app"."exercises" USING btree ("owner_account_id",lower(btrim("name")));
