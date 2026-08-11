ALTER TABLE "app"."store_recipients" ADD COLUMN "delivery_limit_key" varchar(320);--> statement-breakpoint
-- Folds a sub-address tag out of the local part so tagged variants of one
-- inbox share a delivery allowance. Must stay equivalent to
-- resolveDeliveryLimitKey in packages/domain/src/store.
UPDATE "app"."store_recipients"
SET "delivery_limit_key" = regexp_replace("normalized_email", '\+[^@]*@', '@')
WHERE "delivery_limit_key" IS NULL;--> statement-breakpoint
ALTER TABLE "app"."store_recipients" ALTER COLUMN "delivery_limit_key" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "store_recipients_delivery_limit_key_idx" ON "app"."store_recipients" USING btree ("delivery_limit_key");
