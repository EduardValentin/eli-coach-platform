CREATE TABLE "app"."product_price_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"eur_cents" integer,
	"usd_cents" integer,
	"publication_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_price_revisions_sequence_check" CHECK ("app"."product_price_revisions"."sequence" > 0),
	CONSTRAINT "product_price_revisions_amounts_check" CHECK (("app"."product_price_revisions"."eur_cents" is null and "app"."product_price_revisions"."usd_cents" is null) or ("app"."product_price_revisions"."eur_cents" between 1 and 99999999 and "app"."product_price_revisions"."usd_cents" between 1 and 99999999))
);
--> statement-breakpoint
ALTER TABLE "app"."product_publications" DROP CONSTRAINT "product_publications_operation_check";--> statement-breakpoint
ALTER TABLE "app"."product_publications" ALTER COLUMN "product_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."product_price_revisions" ADD CONSTRAINT "product_price_revisions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_price_revisions" ADD CONSTRAINT "product_price_revisions_publication_id_product_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "app"."product_publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_price_revisions_product_sequence_unique" ON "app"."product_price_revisions" USING btree ("product_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "product_price_revisions_publication_unique" ON "app"."product_price_revisions" USING btree ("publication_id");--> statement-breakpoint
ALTER TABLE "app"."product_publications" ADD CONSTRAINT "product_publications_version_check" CHECK (("app"."product_publications"."operation" in ('create_product', 'revise_product')) = ("app"."product_publications"."product_version_id" is not null));--> statement-breakpoint
ALTER TABLE "app"."product_publications" ADD CONSTRAINT "product_publications_operation_check" CHECK ("app"."product_publications"."operation" in ('create_product', 'revise_product', 'reprice_product'));