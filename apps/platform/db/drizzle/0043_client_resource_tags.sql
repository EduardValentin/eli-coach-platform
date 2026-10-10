CREATE TABLE "app"."client_resource_tags" (
	"resource_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"folded" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "client_resource_tags_pkey" PRIMARY KEY("resource_id","folded")
);
--> statement-breakpoint
ALTER TABLE "app"."client_resource_tags" ADD CONSTRAINT "client_resource_tags_resource_id_client_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "app"."client_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_resource_tags_folded_idx" ON "app"."client_resource_tags" USING btree ("folded");