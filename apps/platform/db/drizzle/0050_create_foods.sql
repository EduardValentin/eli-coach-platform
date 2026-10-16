CREATE TABLE "app"."food_tags" (
	"food_id" uuid NOT NULL,
	"tag_id" varchar(40) NOT NULL,
	CONSTRAINT "food_tags_pkey" PRIMARY KEY("food_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "app"."foods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"category" varchar(16) NOT NULL,
	"icon" varchar(16) NOT NULL,
	"kcal" numeric(7, 2) NOT NULL,
	"protein" numeric(7, 2) NOT NULL,
	"carb" numeric(7, 2) NOT NULL,
	"fat" numeric(7, 2) NOT NULL,
	"default_portion_grams" integer NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "foods_category_check" CHECK ("app"."foods"."category" in ('protein', 'carb', 'fat', 'legume', 'extra', 'seasoning')),
	CONSTRAINT "foods_icon_check" CHECK ("app"."foods"."icon" in ('egg', 'poultry', 'meat', 'fish', 'ham', 'dairy', 'grain', 'bread', 'sandwich', 'root-veg', 'leafy', 'veg', 'herb', 'apple', 'banana', 'citrus', 'cherry', 'grape', 'legume', 'nut', 'oil', 'chocolate', 'candy', 'ice-cream', 'cake', 'soup', 'drink', 'other'))
);
--> statement-breakpoint
CREATE TABLE "app"."nutrition_tags" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"family" varchar(16) NOT NULL,
	"label" varchar(40) NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "nutrition_tags_family_check" CHECK ("app"."nutrition_tags"."family" in ('meal-time', 'cycle-phase', 'nutrient', 'dietary'))
);
--> statement-breakpoint
ALTER TABLE "app"."food_tags" ADD CONSTRAINT "food_tags_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "app"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."food_tags" ADD CONSTRAINT "food_tags_tag_id_nutrition_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "app"."nutrition_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."foods" ADD CONSTRAINT "foods_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "app"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "foods_owner_name_unique" ON "app"."foods" USING btree ("owner_account_id",lower(btrim("name"))) WHERE "app"."foods"."archived_at" is null;