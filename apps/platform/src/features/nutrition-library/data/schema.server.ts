import { appSchema } from "@eli-coach-platform/db";
import {
  FOOD_CATEGORIES,
  FOOD_ICONS,
  MAX_FOOD_NAME_LENGTH,
  TAG_FAMILIES,
  type FoodCategory,
  type FoodIcon,
  type TagFamily,
} from "@eli-coach-platform/domain/nutrition";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  integer,
  numeric,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { accountsTable } from "~/features/accounts/data/schema.server";

const MACRO_PER_100G = { precision: 7, scale: 2, mode: "number" } as const;

export const nutritionTagsTable = appSchema.table(
  "nutrition_tags",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    family: varchar("family", { length: 16 }).$type<TagFamily>().notNull(),
    label: varchar("label", { length: 40 }).notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    check(
      "nutrition_tags_family_check",
      sql`${table.family} in (${quotedList(TAG_FAMILIES)})`,
    ),
  ],
);

export const foodsConstraints = {
  nameUnique: "foods_owner_name_unique",
} as const;

export const foodsTable = appSchema.table(
  "foods",
  {
    id: uuid("id").primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => accountsTable.id),
    name: varchar("name", { length: MAX_FOOD_NAME_LENGTH }).notNull(),
    category: varchar("category", { length: 16 })
      .$type<FoodCategory>()
      .notNull(),
    icon: varchar("icon", { length: 16 }).$type<FoodIcon>().notNull(),
    kcal: numeric("kcal", MACRO_PER_100G).notNull(),
    protein: numeric("protein", MACRO_PER_100G).notNull(),
    carb: numeric("carb", MACRO_PER_100G).notNull(),
    fat: numeric("fat", MACRO_PER_100G).notNull(),
    defaultPortionGrams: integer("default_portion_grams").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex(foodsConstraints.nameUnique)
      .on(table.ownerAccountId, sql`lower(btrim(${table.name}))`)
      .where(sql`${table.archivedAt} is null`),
    check(
      "foods_category_check",
      sql`${table.category} in (${quotedList(FOOD_CATEGORIES)})`,
    ),
    check(
      "foods_icon_check",
      sql`${table.icon} in (${quotedList(FOOD_ICONS)})`,
    ),
  ],
);

export const foodTagsTable = appSchema.table(
  "food_tags",
  {
    foodId: uuid("food_id")
      .notNull()
      .references(() => foodsTable.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id", { length: 40 })
      .notNull()
      .references(() => nutritionTagsTable.id),
  },
  (table) => [
    primaryKey({
      name: "food_tags_pkey",
      columns: [table.foodId, table.tagId],
    }),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
