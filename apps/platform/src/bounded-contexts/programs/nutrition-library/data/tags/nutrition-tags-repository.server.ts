import type { DatabaseClient } from "~/shared/database";
import type {
  NutritionTag,
  NutritionTags,
} from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import { asc } from "drizzle-orm";

import { nutritionTagsTable } from "~/bounded-contexts/programs/nutrition-library/data/schema.server";

export class PostgresNutritionTags implements NutritionTags {
  constructor(private readonly database: DatabaseClient) {}

  async list(): Promise<NutritionTag[]> {
    return this.database
      .select({
        id: nutritionTagsTable.id,
        family: nutritionTagsTable.family,
        label: nutritionTagsTable.label,
        order: nutritionTagsTable.displayOrder,
      })
      .from(nutritionTagsTable)
      .orderBy(
        asc(nutritionTagsTable.displayOrder),
        asc(nutritionTagsTable.id),
      );
  }
}
