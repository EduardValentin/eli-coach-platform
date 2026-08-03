CREATE TABLE "app"."acquisition_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"payload_digest" varchar(64) NOT NULL,
	"terms_version" varchar(64) NOT NULL,
	"privacy_policy_version" varchar(64) NOT NULL,
	"marketing_consent_version" varchar(64) NOT NULL,
	"marketing_consent" boolean NOT NULL,
	"marketing_consented_at" timestamp with time zone,
	"requested_product_slugs" jsonb NOT NULL,
	"delivery_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acquisition_requests_payload_digest_check" CHECK ("app"."acquisition_requests"."payload_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "acquisition_requests_product_slugs_check" CHECK (jsonb_typeof("app"."acquisition_requests"."requested_product_slugs") = 'array' and jsonb_array_length("app"."acquisition_requests"."requested_product_slugs") > 0),
	CONSTRAINT "acquisition_requests_delivery_status_check" CHECK ("app"."acquisition_requests"."delivery_status" in ('pending', 'accepted', 'rejected')),
	CONSTRAINT "acquisition_requests_marketing_consent_check" CHECK (("app"."acquisition_requests"."marketing_consent" and "app"."acquisition_requests"."marketing_consented_at" is not null) or (not "app"."acquisition_requests"."marketing_consent" and "app"."acquisition_requests"."marketing_consented_at" is null))
);
--> statement-breakpoint
CREATE TABLE "app"."acquisitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"first_requested_at" timestamp with time zone NOT NULL,
	"last_requested_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "acquisitions_request_count_check" CHECK ("app"."acquisitions"."request_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."delivery_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"provider" varchar(64) NOT NULL,
	"provider_idempotency_key" varchar(128) NOT NULL,
	"provider_message_id" varchar(255),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_attempts_status_check" CHECK ("app"."delivery_attempts"."status" in ('pending', 'accepted', 'rejected', 'retryable')),
	CONSTRAINT "delivery_attempts_provider_message_check" CHECK (("app"."delivery_attempts"."status" = 'accepted' and "app"."delivery_attempts"."provider_message_id" is not null and length(btrim("app"."delivery_attempts"."provider_message_id")) > 0) or ("app"."delivery_attempts"."status" <> 'accepted' and "app"."delivery_attempts"."provider_message_id" is null))
);
--> statement-breakpoint
CREATE TABLE "app"."download_grant_items" (
	"grant_id" integer NOT NULL,
	"product_version_id" integer NOT NULL,
	CONSTRAINT "download_grant_items_pkey" PRIMARY KEY("grant_id","product_version_id")
);
--> statement-breakpoint
CREATE TABLE "app"."download_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"token_sha256" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "download_grants_status_check" CHECK ("app"."download_grants"."status" in ('active', 'revoked')),
	CONSTRAINT "download_grants_token_sha256_check" CHECK ("app"."download_grants"."token_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."product_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"display_label" varchar(96) NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "product_goals_slug_format_check" CHECK ("app"."product_goals"."slug" ~ '^[a-z0-9][a-z0-9-]*$')
);
--> statement-breakpoint
CREATE TABLE "app"."product_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"display_label" varchar(96) NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "product_types_slug_format_check" CHECK ("app"."product_types"."slug" ~ '^[a-z0-9][a-z0-9-]*$')
);
--> statement-breakpoint
CREATE TABLE "app"."product_version_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_version_id" integer NOT NULL,
	"asset_key" varchar(512) NOT NULL,
	"customer_filename" varchar(255) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" varchar(64) NOT NULL,
	CONSTRAINT "product_version_assets_relative_key_check" CHECK (length(btrim("app"."product_version_assets"."asset_key")) > 0 and "app"."product_version_assets"."asset_key" !~ '(^/|(^|/)\.\.(/|$))' and position(chr(92) in "app"."product_version_assets"."asset_key") = 0 and "app"."product_version_assets"."asset_key" !~ '^[A-Za-z]:'),
	CONSTRAINT "product_version_assets_customer_filename_check" CHECK (length(btrim("app"."product_version_assets"."customer_filename")) > 0 and "app"."product_version_assets"."customer_filename" not in ('.', '..') and position('/' in "app"."product_version_assets"."customer_filename") = 0 and position(chr(92) in "app"."product_version_assets"."customer_filename") = 0),
	CONSTRAINT "product_version_assets_size_check" CHECK ("app"."product_version_assets"."size_bytes" >= 0),
	CONSTRAINT "product_version_assets_sha256_check" CHECK ("app"."product_version_assets"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."product_version_goal_assignments" (
	"product_version_id" integer NOT NULL,
	"product_goal_id" integer NOT NULL,
	CONSTRAINT "product_version_goal_assignments_pkey" PRIMARY KEY("product_version_id","product_goal_id")
);
--> statement-breakpoint
CREATE TABLE "app"."product_version_type_assignments" (
	"product_version_id" integer NOT NULL,
	"product_type_id" integer NOT NULL,
	CONSTRAINT "product_version_type_assignments_pkey" PRIMARY KEY("product_version_id","product_type_id")
);
--> statement-breakpoint
CREATE TABLE "app"."product_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"title" varchar(240) NOT NULL,
	"creator_name" varchar(160) NOT NULL,
	"card_summary" varchar(500) NOT NULL,
	"detail_description" text NOT NULL,
	"included_items" jsonb NOT NULL,
	"cover_asset_key" varchar(512) NOT NULL,
	"cover_alt" varchar(500) NOT NULL,
	"cover_mime_type" varchar(255) NOT NULL,
	"cover_size_bytes" integer NOT NULL,
	"cover_sha256" varchar(64) NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_versions_sequence_check" CHECK ("app"."product_versions"."sequence" > 0),
	CONSTRAINT "product_versions_included_items_check" CHECK (jsonb_typeof("app"."product_versions"."included_items") = 'array'),
	CONSTRAINT "product_versions_cover_relative_key_check" CHECK (length(btrim("app"."product_versions"."cover_asset_key")) > 0 and "app"."product_versions"."cover_asset_key" !~ '(^/|(^|/)\.\.(/|$))' and position(chr(92) in "app"."product_versions"."cover_asset_key") = 0 and "app"."product_versions"."cover_asset_key" !~ '^[A-Za-z]:'),
	CONSTRAINT "product_versions_cover_mime_type_check" CHECK ("app"."product_versions"."cover_mime_type" in ('image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "product_versions_cover_size_check" CHECK ("app"."product_versions"."cover_size_bytes" >= 0),
	CONSTRAINT "product_versions_cover_sha256_check" CHECK ("app"."product_versions"."cover_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"lifecycle_status" varchar(32) DEFAULT 'draft' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_format_check" CHECK ("app"."products"."slug" ~ '^[a-z0-9][a-z0-9-]*$'),
	CONSTRAINT "products_lifecycle_status_check" CHECK ("app"."products"."lifecycle_status" in ('draft', 'published', 'archived')),
	CONSTRAINT "products_display_order_check" CHECK ("app"."products"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."store_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"normalized_email" varchar(320) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."store_asset_identities" (
	"asset_key" varchar(512) PRIMARY KEY NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_asset_identities_relative_key_check" CHECK (length(btrim("app"."store_asset_identities"."asset_key")) > 0 and "app"."store_asset_identities"."asset_key" !~ '(^/|(^|/)\.\.(/|$))' and position(chr(92) in "app"."store_asset_identities"."asset_key") = 0 and "app"."store_asset_identities"."asset_key" !~ '^[A-Za-z]:'),
	CONSTRAINT "store_asset_identities_mime_type_check" CHECK (length(btrim("app"."store_asset_identities"."mime_type")) > 0),
	CONSTRAINT "store_asset_identities_size_check" CHECK ("app"."store_asset_identities"."size_bytes" >= 0),
	CONSTRAINT "store_asset_identities_sha256_check" CHECK ("app"."store_asset_identities"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "app"."acquisition_requests" ADD CONSTRAINT "acquisition_requests_recipient_id_store_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "app"."store_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."acquisitions" ADD CONSTRAINT "acquisitions_recipient_id_store_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "app"."store_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."acquisitions" ADD CONSTRAINT "acquisitions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."delivery_attempts" ADD CONSTRAINT "delivery_attempts_request_id_acquisition_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "app"."acquisition_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_grant_items" ADD CONSTRAINT "download_grant_items_grant_id_download_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "app"."download_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_grant_items" ADD CONSTRAINT "download_grant_items_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "app"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_grants" ADD CONSTRAINT "download_grants_request_id_acquisition_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "app"."acquisition_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_version_assets" ADD CONSTRAINT "product_version_assets_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "app"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_version_assets" ADD CONSTRAINT "product_version_assets_asset_key_store_asset_identities_asset_key_fk" FOREIGN KEY ("asset_key") REFERENCES "app"."store_asset_identities"("asset_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_version_goal_assignments" ADD CONSTRAINT "product_version_goal_assignments_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "app"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_version_goal_assignments" ADD CONSTRAINT "product_version_goal_assignments_product_goal_id_product_goals_id_fk" FOREIGN KEY ("product_goal_id") REFERENCES "app"."product_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_version_type_assignments" ADD CONSTRAINT "product_version_type_assignments_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "app"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_version_type_assignments" ADD CONSTRAINT "product_version_type_assignments_product_type_id_product_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "app"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_versions" ADD CONSTRAINT "product_versions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_versions" ADD CONSTRAINT "product_versions_cover_asset_key_store_asset_identities_asset_key_fk" FOREIGN KEY ("cover_asset_key") REFERENCES "app"."store_asset_identities"("asset_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "acquisition_requests_idempotency_key_unique" ON "app"."acquisition_requests" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "acquisition_requests_recipient_created_idx" ON "app"."acquisition_requests" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "acquisitions_recipient_product_unique" ON "app"."acquisitions" USING btree ("recipient_id","product_id");--> statement-breakpoint
CREATE INDEX "delivery_attempts_request_created_idx" ON "app"."delivery_attempts" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "download_grants_request_unique" ON "app"."download_grants" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "download_grants_token_sha256_unique" ON "app"."download_grants" USING btree ("token_sha256");--> statement-breakpoint
CREATE INDEX "download_grants_expiry_idx" ON "app"."download_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_goals_slug_unique" ON "app"."product_goals" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "product_goals_display_order_unique" ON "app"."product_goals" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_types_slug_unique" ON "app"."product_types" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "product_types_display_order_unique" ON "app"."product_types" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_version_assets_key_unique" ON "app"."product_version_assets" USING btree ("product_version_id","asset_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_version_assets_customer_filename_unique" ON "app"."product_version_assets" USING btree ("product_version_id","customer_filename");--> statement-breakpoint
CREATE UNIQUE INDEX "product_versions_product_sequence_unique" ON "app"."product_versions" USING btree ("product_id","sequence");--> statement-breakpoint
CREATE INDEX "product_versions_publication_idx" ON "app"."product_versions" USING btree ("product_id","published_at","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "app"."products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_publication_order_idx" ON "app"."products" USING btree ("lifecycle_status","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "store_recipients_normalized_email_unique" ON "app"."store_recipients" USING btree ("normalized_email");--> statement-breakpoint
INSERT INTO "app"."product_types" ("slug", "display_label", "display_order")
VALUES
  ('workouts', 'Workouts', 1),
  ('nutrition-plans', 'Nutrition Plans', 2),
  ('e-books', 'E-Books', 3);--> statement-breakpoint
INSERT INTO "app"."product_goals" ("slug", "display_label", "display_order")
VALUES
  ('muscle-building', 'Muscle Building', 1),
  ('fat-loss', 'Fat Loss', 2),
  ('wellness', 'Wellness', 3),
  ('hormonal-balance', 'Hormonal Balance', 4);--> statement-breakpoint
CREATE FUNCTION "app"."reject_published_product_version_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'Product versions must be created as drafts before publication.';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published product versions are immutable.';
  END IF;

  IF
    TG_OP = 'UPDATE'
    AND NEW.published_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "app"."product_version_assets"
      WHERE product_version_id = NEW.id
    )
  THEN
    RAISE EXCEPTION 'Published product versions require at least one downloadable asset.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER "product_versions_reject_published_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "app"."product_versions"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_published_product_version_mutation"();--> statement-breakpoint
CREATE FUNCTION "app"."reject_published_product_version_child_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  original_version_id integer;
  target_version_id integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_version_id := NEW.product_version_id;
  ELSIF TG_OP = 'DELETE' THEN
    original_version_id := OLD.product_version_id;
  ELSE
    original_version_id := OLD.product_version_id;
    target_version_id := NEW.product_version_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "app"."product_versions"
    WHERE id IN (original_version_id, target_version_id)
      AND published_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Published product version content is immutable.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER "product_version_assets_reject_published_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "app"."product_version_assets"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_published_product_version_child_mutation"();--> statement-breakpoint
CREATE TRIGGER "product_version_type_assignments_reject_published_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "app"."product_version_type_assignments"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_published_product_version_child_mutation"();--> statement-breakpoint
CREATE TRIGGER "product_version_goal_assignments_reject_published_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "app"."product_version_goal_assignments"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_published_product_version_child_mutation"();--> statement-breakpoint
CREATE FUNCTION "app"."reject_product_slug_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug <> OLD.slug THEN
    RAISE EXCEPTION 'Product slugs are immutable.';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "products_reject_slug_mutation"
BEFORE UPDATE ON "app"."products"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_product_slug_mutation"();--> statement-breakpoint
CREATE FUNCTION "app"."reject_store_taxonomy_slug_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug <> OLD.slug THEN
    RAISE EXCEPTION 'Store taxonomy slugs are immutable.';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "product_types_reject_slug_mutation"
BEFORE UPDATE ON "app"."product_types"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_store_taxonomy_slug_mutation"();--> statement-breakpoint
CREATE TRIGGER "product_goals_reject_slug_mutation"
BEFORE UPDATE ON "app"."product_goals"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_store_taxonomy_slug_mutation"();--> statement-breakpoint
CREATE FUNCTION "app"."register_store_asset_identity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  canonical_mime_type varchar(255);
  canonical_size_bytes integer;
  canonical_sha256 varchar(64);
BEGIN
  IF TG_TABLE_NAME = 'product_versions' THEN
    INSERT INTO "app"."store_asset_identities" (
      asset_key,
      mime_type,
      size_bytes,
      sha256
    )
    VALUES (
      NEW.cover_asset_key,
      NEW.cover_mime_type,
      NEW.cover_size_bytes,
      NEW.cover_sha256
    )
    ON CONFLICT (asset_key)
    DO UPDATE SET asset_key = EXCLUDED.asset_key
    RETURNING mime_type, size_bytes, sha256
    INTO canonical_mime_type, canonical_size_bytes, canonical_sha256;

    IF
      canonical_mime_type IS DISTINCT FROM NEW.cover_mime_type
      OR canonical_size_bytes IS DISTINCT FROM NEW.cover_size_bytes
      OR canonical_sha256 IS DISTINCT FROM NEW.cover_sha256
    THEN
      RAISE EXCEPTION 'Store asset keys must retain one immutable identity.';
    END IF;
  ELSE
    INSERT INTO "app"."store_asset_identities" (
      asset_key,
      mime_type,
      size_bytes,
      sha256
    )
    VALUES (
      NEW.asset_key,
      NEW.mime_type,
      NEW.size_bytes,
      NEW.sha256
    )
    ON CONFLICT (asset_key)
    DO UPDATE SET asset_key = EXCLUDED.asset_key
    RETURNING mime_type, size_bytes, sha256
    INTO canonical_mime_type, canonical_size_bytes, canonical_sha256;

    IF
      canonical_mime_type IS DISTINCT FROM NEW.mime_type
      OR canonical_size_bytes IS DISTINCT FROM NEW.size_bytes
      OR canonical_sha256 IS DISTINCT FROM NEW.sha256
    THEN
      RAISE EXCEPTION 'Store asset keys must retain one immutable identity.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "product_versions_register_cover_asset_identity"
BEFORE INSERT OR UPDATE OF
  cover_asset_key,
  cover_mime_type,
  cover_size_bytes,
  cover_sha256
ON "app"."product_versions"
FOR EACH ROW
EXECUTE FUNCTION "app"."register_store_asset_identity"();--> statement-breakpoint
CREATE TRIGGER "product_version_assets_register_asset_identity"
BEFORE INSERT OR UPDATE OF asset_key, mime_type, size_bytes, sha256
ON "app"."product_version_assets"
FOR EACH ROW
EXECUTE FUNCTION "app"."register_store_asset_identity"();--> statement-breakpoint
CREATE FUNCTION "app"."reject_store_asset_identity_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Store asset identities are immutable.';
  END IF;

  IF NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Store asset identities are immutable.';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "store_asset_identities_reject_mutation"
BEFORE UPDATE OR DELETE ON "app"."store_asset_identities"
FOR EACH ROW
EXECUTE FUNCTION "app"."reject_store_asset_identity_mutation"();--> statement-breakpoint
CREATE FUNCTION "app"."enforce_delivery_attempt_history"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  initial_provider varchar(64);
  initial_provider_idempotency_key varchar(128);
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT provider, provider_idempotency_key
    INTO initial_provider, initial_provider_idempotency_key
    FROM "app"."delivery_attempts"
    WHERE request_id = NEW.request_id
    ORDER BY id
    LIMIT 1;

    IF
      initial_provider IS NOT NULL
      AND (
        NEW.provider IS DISTINCT FROM initial_provider
        OR NEW.provider_idempotency_key
          IS DISTINCT FROM initial_provider_idempotency_key
      )
    THEN
      RAISE EXCEPTION 'Delivery retries must retain their original provider namespace.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Delivery attempt history is immutable.';
  END IF;

  IF
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.request_id IS DISTINCT FROM OLD.request_id
    OR NEW.provider IS DISTINCT FROM OLD.provider
    OR NEW.provider_idempotency_key
      IS DISTINCT FROM OLD.provider_idempotency_key
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR OLD.status <> 'pending'
  THEN
    RAISE EXCEPTION 'Delivery attempt history is immutable.';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "delivery_attempts_enforce_history"
BEFORE INSERT OR UPDATE OR DELETE ON "app"."delivery_attempts"
FOR EACH ROW
EXECUTE FUNCTION "app"."enforce_delivery_attempt_history"();--> statement-breakpoint
CREATE FUNCTION "app"."enforce_download_grant_immutability"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  original_request_id integer;
  target_request_id integer;
  is_issued boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    original_request_id := OLD.request_id;
  ELSE
    original_request_id := OLD.request_id;
    target_request_id := NEW.request_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "app"."delivery_attempts"
    WHERE request_id IN (original_request_id, target_request_id)
  )
  INTO is_issued;

  IF NOT is_issued THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Issued download grants are immutable.';
  END IF;

  IF
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.request_id IS DISTINCT FROM OLD.request_id
    OR NEW.token_sha256 IS DISTINCT FROM OLD.token_sha256
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR (OLD.status = 'revoked' AND NEW.status <> 'revoked')
  THEN
    RAISE EXCEPTION 'Issued download grants are immutable.';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "download_grants_enforce_immutability"
BEFORE UPDATE OR DELETE ON "app"."download_grants"
FOR EACH ROW
EXECUTE FUNCTION "app"."enforce_download_grant_immutability"();--> statement-breakpoint
CREATE FUNCTION "app"."enforce_download_grant_item_immutability"()
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
    FROM "app"."download_grants" download_grant
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
$$;--> statement-breakpoint
CREATE TRIGGER "download_grant_items_enforce_immutability"
BEFORE INSERT OR UPDATE OR DELETE ON "app"."download_grant_items"
FOR EACH ROW
EXECUTE FUNCTION "app"."enforce_download_grant_item_immutability"();
