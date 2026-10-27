import type { DatabaseClient } from "~/shared/database";
import type {
  NutritionTag,
  NutritionTags,
} from "@eli-coach-platform/domain/nutrition";
import { asc } from "drizzle-orm";

import { nutritionTagsTable } from "~/features/nutrition-library/data/schema.server";

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
