CREATE TABLE "app"."store_order_items" (
	"order_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_version_id" integer NOT NULL,
	"title" varchar(240) NOT NULL,
	"amount_minor_units" integer NOT NULL,
	CONSTRAINT "store_order_items_pkey" PRIMARY KEY("order_id","position"),
	CONSTRAINT "store_order_items_position_check" CHECK ("app"."store_order_items"."position" >= 0),
	CONSTRAINT "store_order_items_amount_check" CHECK ("app"."store_order_items"."amount_minor_units" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."store_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"payload_digest" varchar(64) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"checkout_session_id" varchar(255),
	"checkout_url" text,
	"payment_intent_id" varchar(255),
	"charged_minor_units" integer,
	"charged_currency" varchar(3),
	"paid_at" timestamp with time zone,
	"terms_version" varchar(64) NOT NULL,
	"privacy_policy_version" varchar(64) NOT NULL,
	"marketing_consent_version" varchar(64) NOT NULL,
	"marketing_consent" boolean NOT NULL,
	"marketing_consented_at" timestamp with time zone,
	"delivery_consent_terms_version" varchar(64) NOT NULL,
	"delivery_consented_at" timestamp with time zone NOT NULL,
	"placed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_orders_payload_digest_check" CHECK ("app"."store_orders"."payload_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "store_orders_currency_check" CHECK ("app"."store_orders"."currency" in ('EUR', 'USD')),
	CONSTRAINT "store_orders_status_check" CHECK ("app"."store_orders"."status" in ('pending', 'paid')),
	CONSTRAINT "store_orders_checkout_check" CHECK (("app"."store_orders"."checkout_session_id" is null) = ("app"."store_orders"."checkout_url" is null)),
	CONSTRAINT "store_orders_payment_check" CHECK (("app"."store_orders"."status" = 'paid' and "app"."store_orders"."checkout_session_id" is not null and "app"."store_orders"."charged_minor_units" is not null and "app"."store_orders"."charged_minor_units" >= 0 and "app"."store_orders"."charged_currency" is not null and "app"."store_orders"."paid_at" is not null) or ("app"."store_orders"."status" = 'pending' and "app"."store_orders"."payment_intent_id" is null and "app"."store_orders"."charged_minor_units" is null and "app"."store_orders"."charged_currency" is null and "app"."store_orders"."paid_at" is null)),
	CONSTRAINT "store_orders_marketing_consent_check" CHECK (("app"."store_orders"."marketing_consent" and "app"."store_orders"."marketing_consented_at" is not null) or (not "app"."store_orders"."marketing_consent" and "app"."store_orders"."marketing_consented_at" is null))
);
--> statement-breakpoint
ALTER TABLE "app"."delivery_attempts" ALTER COLUMN "request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."download_grants" ALTER COLUMN "request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."delivery_attempts" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."download_grants" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."store_order_items" ADD CONSTRAINT "store_order_items_order_id_store_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."store_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."store_order_items" ADD CONSTRAINT "store_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."store_order_items" ADD CONSTRAINT "store_order_items_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "app"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."store_orders" ADD CONSTRAINT "store_orders_recipient_id_store_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "app"."store_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_order_items_order_version_unique" ON "app"."store_order_items" USING btree ("order_id","product_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_orders_idempotency_key_unique" ON "app"."store_orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "store_orders_checkout_session_unique" ON "app"."store_orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "store_orders_recipient_placed_idx" ON "app"."store_orders" USING btree ("recipient_id","placed_at");--> statement-breakpoint
ALTER TABLE "app"."delivery_attempts" ADD CONSTRAINT "delivery_attempts_order_id_store_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."store_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_grants" ADD CONSTRAINT "download_grants_order_id_store_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."store_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_attempts_order_created_idx" ON "app"."delivery_attempts" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "download_grants_order_unique" ON "app"."download_grants" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "app"."delivery_attempts" ADD CONSTRAINT "delivery_attempts_owner_check" CHECK (num_nonnulls("app"."delivery_attempts"."request_id", "app"."delivery_attempts"."order_id") = 1);--> statement-breakpoint
ALTER TABLE "app"."download_grants" ADD CONSTRAINT "download_grants_owner_check" CHECK (num_nonnulls("app"."download_grants"."request_id", "app"."download_grants"."order_id") = 1);