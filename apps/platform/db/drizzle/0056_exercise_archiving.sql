DROP INDEX "app"."exercises_owner_name_unique";--> statement-breakpoint
ALTER TABLE "app"."exercises" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_owner_name_unique" ON "app"."exercises" USING btree ("owner_account_id",lower(btrim("name"))) WHERE "app"."exercises"."archived_at" is null;