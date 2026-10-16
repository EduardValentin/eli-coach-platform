import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  Food,
  type FoodAddition,
  type FoodLibrary,
  type FoodReference,
  type FoodReplacement,
} from "@eli-coach-platform/domain/nutrition";
import {
  and,
  asc,
  eq,
  getTableColumns,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  foodsConstraints,
  foodsTable,
  foodTagsTable,
  nutritionTagsTable,
} from "~/features/nutrition-library/data/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

export class PostgresFoodLibrary implements FoodLibrary {
  constructor(private readonly database: DatabaseClient) {}

  async list(ownerAccountId: string): Promise<Food[]> {
    const rows = await this.selectFoods()
      .where(
        and(
          eq(foodsTable.ownerAccountId, ownerAccountId),
          isNull(foodsTable.archivedAt),
        ),
      )
      .orderBy(asc(sql`lower(${foodsTable.name})`), asc(foodsTable.id));

    return rows.map((row) => Food.reconstitute(row));
  }

  async find({ ownerAccountId, foodId }: FoodReference): Promise<Food | null> {
    const [row] = await this.selectFoods()
      .where(
        and(
          eq(foodsTable.id, foodId),
          eq(foodsTable.ownerAccountId, ownerAccountId),
        ),
      )
      .limit(1);

    return row ? Food.reconstitute(row) : null;
  }

  async add(food: Food): Promise<FoodAddition> {
    const { tagIds, ...row } = food.toSnapshot();

    try {
      await this.database.transaction(async (transaction) => {
        await transaction.insert(foodsTable).values(row);
        await this.tag(transaction, row.id, tagIds);
      });

      return "added";
    } catch (error) {
      return this.nameTakenOrRethrow(error);
    }
  }

  async replace(food: Food): Promise<FoodReplacement> {
    const {
      id,
      ownerAccountId,
      createdAt: _createdAt,
      tagIds,
      ...columns
    } = food.toSnapshot();

    try {
      await this.database.transaction(async (transaction) => {
        await transaction
          .update(foodsTable)
          .set(columns)
          .where(
            and(
              eq(foodsTable.id, id),
              eq(foodsTable.ownerAccountId, ownerAccountId),
            ),
          );
        await transaction
          .delete(foodTagsTable)
          .where(eq(foodTagsTable.foodId, id));
        await this.tag(transaction, id, tagIds);
      });

      return "replaced";
    } catch (error) {
      return this.nameTakenOrRethrow(error);
    }
  }

  private selectFoods() {
    return this.database
      .select({ ...getTableColumns(foodsTable), tagIds: this.tagIdsOfFood() })
      .from(foodsTable)
      .$dynamic();
  }

  private tagIdsOfFood(): SQL<string[]> {
    const tagIds = this.database
      .select({ tagId: foodTagsTable.tagId })
      .from(foodTagsTable)
      .innerJoin(
        nutritionTagsTable,
        eq(nutritionTagsTable.id, foodTagsTable.tagId),
      )
      .where(eq(foodTagsTable.foodId, foodsTable.id))
      .orderBy(asc(nutritionTagsTable.displayOrder));

    return sql<string[]>`array(${tagIds})`;
  }

  private async tag(
    transaction: DatabaseTransaction,
    foodId: string,
    tagIds: readonly string[],
  ): Promise<void> {
    if (tagIds.length === 0) return;

    await transaction
      .insert(foodTagsTable)
      .values(tagIds.map((tagId) => ({ foodId, tagId })));
  }

  private nameTakenOrRethrow(error: unknown): "name-taken" {
    const nameTaken = isCausedByDatabaseError(
      error,
      ({ code, constraint }) =>
        code === UNIQUE_VIOLATION_CODE &&
        constraint === foodsConstraints.nameUnique,
    );

    if (!nameTaken) {
      throw error;
    }

    return "name-taken";
  }
}
