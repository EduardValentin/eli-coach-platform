CREATE TABLE "app"."recipe_ingredients" (
	"recipe_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"food_id" uuid NOT NULL,
	"grams" integer NOT NULL,
	"method" varchar(16) NOT NULL,
	CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY("recipe_id","position"),
	CONSTRAINT "recipe_ingredients_method_check" CHECK ("app"."recipe_ingredients"."method" in ('raw', 'boiled', 'grilled', 'baked', 'pan-fried', 'steamed'))
);
--> statement-breakpoint
CREATE TABLE "app"."recipe_tags" (
	"recipe_id" uuid NOT NULL,
	"tag_id" varchar(40) NOT NULL,
	CONSTRAINT "recipe_tags_pkey" PRIMARY KEY("recipe_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "app"."recipes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"prep_minutes" integer NOT NULL,
	"cook_minutes" integer NOT NULL,
	"instructions" varchar(2000) NOT NULL,
	"icon" varchar(16),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "recipes_icon_check" CHECK ("app"."recipes"."icon" in ('soup', 'salad', 'sandwich', 'pizza', 'steak', 'poultry', 'fish', 'eggs', 'pastry', 'pot', 'cake', 'ice-cream', 'cookie', 'donut', 'coffee', 'smoothie', 'meal'))
);
--> statement-breakpoint
ALTER TABLE "app"."recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "app"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "app"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recipe_tags" ADD CONSTRAINT "recipe_tags_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "app"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recipe_tags" ADD CONSTRAINT "recipe_tags_tag_id_nutrition_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "app"."nutrition_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."recipes" ADD CONSTRAINT "recipes_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "app"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_owner_name_unique" ON "app"."recipes" USING btree ("owner_account_id",lower(btrim("name"))) WHERE "app"."recipes"."archived_at" is null;