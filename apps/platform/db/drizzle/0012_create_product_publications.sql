CREATE TABLE "app"."product_publications" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"product_version_id" integer NOT NULL,
	"operation" varchar(32) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"payload_digest" varchar(64) NOT NULL,
	"published_by_kind" varchar(16) NOT NULL,
	"published_by_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_publications_operation_check" CHECK ("app"."product_publications"."operation" in ('create_product', 'revise_product')),
	CONSTRAINT "product_publications_payload_digest_check" CHECK ("app"."product_publications"."payload_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "product_publications_published_by_kind_check" CHECK ("app"."product_publications"."published_by_kind" in ('machine', 'user')),
	CONSTRAINT "product_publications_published_by_id_check" CHECK (length(btrim("app"."product_publications"."published_by_id")) > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."product_publications" ADD CONSTRAINT "product_publications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_publications" ADD CONSTRAINT "product_publications_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "app"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_publications_idempotency_key_unique" ON "app"."product_publications" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_publications_version_unique" ON "app"."product_publications" USING btree ("product_version_id");--> statement-breakpoint
CREATE INDEX "product_publications_product_created_idx" ON "app"."product_publications" USING btree ("product_id","created_at");