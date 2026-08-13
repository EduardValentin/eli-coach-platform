ALTER TABLE "app"."store_recipients" ADD COLUMN "delivery_limit_key" varchar(320) NOT NULL;--> statement-breakpoint
CREATE INDEX "store_recipients_delivery_limit_key_idx" ON "app"."store_recipients" USING btree ("delivery_limit_key");
