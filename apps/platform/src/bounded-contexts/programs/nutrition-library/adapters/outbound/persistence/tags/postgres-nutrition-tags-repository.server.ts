import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  NutritionTag,
  NutritionTagsPort,
} from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import { asc } from "drizzle-orm";

import { nutritionTagsTable } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/schema.server";

export class PostgresNutritionTagsRepository implements NutritionTagsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async list(): Promise<NutritionTag[]> {
    return this.executor
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
