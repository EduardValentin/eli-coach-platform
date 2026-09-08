ALTER TABLE "app"."download_grant_items" RENAME TO "email_download_grant_items";--> statement-breakpoint
ALTER TABLE "app"."download_grants" RENAME TO "email_download_grants";--> statement-breakpoint
ALTER TABLE "app"."email_download_grants" DROP CONSTRAINT "download_grants_status_check";--> statement-breakpoint
ALTER TABLE "app"."email_download_grants" DROP CONSTRAINT "download_grants_token_sha256_check";--> statement-breakpoint
ALTER TABLE "app"."email_download_grant_items" DROP CONSTRAINT "download_grant_items_grant_id_download_grants_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."email_download_grant_items" DROP CONSTRAINT "download_grant_items_product_version_id_product_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."email_download_grants" DROP CONSTRAINT "download_grants_request_id_acquisition_requests_id_fk";
--> statement-breakpoint
DROP INDEX "app"."download_grants_request_unique";--> statement-breakpoint
DROP INDEX "app"."download_grants_token_sha256_unique";--> statement-breakpoint
DROP INDEX "app"."download_grants_expiry_idx";--> statement-breakpoint
ALTER TABLE "app"."email_download_grant_items" DROP CONSTRAINT "download_grant_items_pkey";--> statement-breakpoint
ALTER TABLE "app"."email_download_grant_items" ADD CONSTRAINT "email_download_grant_items_pkey" PRIMARY KEY("grant_id","product_version_id");--> statement-breakpoint
ALTER TABLE "app"."email_download_grant_items" ADD CONSTRAINT "email_download_grant_items_grant_id_email_download_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "app"."email_download_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_download_grant_items" ADD CONSTRAINT "email_download_grant_items_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "app"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."email_download_grants" ADD CONSTRAINT "email_download_grants_request_id_acquisition_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "app"."acquisition_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_download_grants_request_unique" ON "app"."email_download_grants" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_download_grants_token_sha256_unique" ON "app"."email_download_grants" USING btree ("token_sha256");--> statement-breakpoint
CREATE INDEX "email_download_grants_expiry_idx" ON "app"."email_download_grants" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "app"."email_download_grants" ADD CONSTRAINT "email_download_grants_status_check" CHECK ("app"."email_download_grants"."status" in ('active', 'revoked'));--> statement-breakpoint
ALTER TABLE "app"."email_download_grants" ADD CONSTRAINT "email_download_grants_token_sha256_check" CHECK ("app"."email_download_grants"."token_sha256" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
-- PL/pgSQL bodies re-resolve table names at call time, so the 0009 trigger function still named the old table; its trigger, function name and message are deliberately unchanged.
CREATE OR REPLACE FUNCTION "app"."enforce_download_grant_item_immutability"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  original_grant_id integer;
  target_grant_id integer;
  is_issued boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_grant_id := NEW.grant_id;
  ELSIF TG_OP = 'DELETE' THEN
    original_grant_id := OLD.grant_id;
  ELSE
    original_grant_id := OLD.grant_id;
    target_grant_id := NEW.grant_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "app"."email_download_grants" download_grant
    JOIN "app"."delivery_attempts" attempt
      ON attempt.request_id = download_grant.request_id
    WHERE download_grant.id IN (original_grant_id, target_grant_id)
  )
  INTO is_issued;

  IF is_issued THEN
    RAISE EXCEPTION 'Issued download grant items are immutable.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;