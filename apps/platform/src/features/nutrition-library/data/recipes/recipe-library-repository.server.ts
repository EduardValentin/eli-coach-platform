import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  Recipe,
  type RecipeAddition,
  type RecipeIngredientSnapshot,
  type RecipeLibrary,
  type RecipeReference,
  type RecipeReplacement,
  type RecipeSnapshot,
  type TagFamily,
} from "@eli-coach-platform/domain/nutrition";
import {
  and,
  asc,
  eq,
  getTableColumns,
  isNull,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  nutritionTagsTable,
  recipeIngredientsTable,
  recipesConstraints,
  recipesTable,
  recipeTagsTable,
} from "~/features/nutrition-library/data/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

const ROLE_FAMILY: TagFamily = "meal-time";

type RecipeRow = Omit<RecipeSnapshot, "photo"> & { photoId: string | null };

export class PostgresRecipeLibrary implements RecipeLibrary {
  constructor(private readonly database: DatabaseClient) {}

  async list(ownerAccountId: string): Promise<Recipe[]> {
    const rows = await this.selectRecipes()
      .where(
        and(
          eq(recipesTable.ownerAccountId, ownerAccountId),
          isNull(recipesTable.archivedAt),
        ),
      )
      .orderBy(asc(sql`lower(${recipesTable.name})`), asc(recipesTable.id));

    return rows.map((row) => this.recipeOf(row));
  }

  async find({
    ownerAccountId,
    recipeId,
  }: RecipeReference): Promise<Recipe | null> {
    const [row] = await this.selectRecipes()
      .where(
        and(
          eq(recipesTable.id, recipeId),
          eq(recipesTable.ownerAccountId, ownerAccountId),
        ),
      )
      .limit(1);

    return row ? this.recipeOf(row) : null;
  }

  async add(recipe: Recipe): Promise<RecipeAddition> {
    const { ingredients, mealRoleIds, tagIds, photo, ...row } =
      recipe.toSnapshot();

    try {
      await this.database.transaction(async (transaction) => {
        await transaction
          .insert(recipesTable)
          .values({ ...row, photoId: photo?.photoId ?? null });
        await this.place(transaction, row.id, ingredients);
        await this.tag(transaction, row.id, [...mealRoleIds, ...tagIds]);
      });

      return "added";
    } catch (error) {
      return this.nameTakenOrRethrow(error);
    }
  }

  async replace(recipe: Recipe): Promise<RecipeReplacement> {
    const {
      id,
      ownerAccountId,
      createdAt: _createdAt,
      ingredients,
      mealRoleIds,
      tagIds,
      photo,
      ...columns
    } = recipe.toSnapshot();

    try {
      await this.database.transaction(async (transaction) => {
        await transaction
          .update(recipesTable)
          .set({ ...columns, photoId: photo?.photoId ?? null })
          .where(
            and(
              eq(recipesTable.id, id),
              eq(recipesTable.ownerAccountId, ownerAccountId),
            ),
          );
        await transaction
          .delete(recipeIngredientsTable)
          .where(eq(recipeIngredientsTable.recipeId, id));
        await this.place(transaction, id, ingredients);
        await transaction
          .delete(recipeTagsTable)
          .where(eq(recipeTagsTable.recipeId, id));
        await this.tag(transaction, id, [...mealRoleIds, ...tagIds]);
      });

      return "replaced";
    } catch (error) {
      return this.nameTakenOrRethrow(error);
    }
  }

  private recipeOf({ photoId, ...fields }: RecipeRow): Recipe {
    return Recipe.reconstitute({
      ...fields,
      photo: photoId === null ? null : { photoId },
    });
  }

  private selectRecipes() {
    return this.database
      .select({
        ...getTableColumns(recipesTable),
        ingredients: this.ingredientsOfRecipe(),
        mealRoleIds: this.tagIdsOfRecipe(
          eq(nutritionTagsTable.family, ROLE_FAMILY),
        ),
        tagIds: this.tagIdsOfRecipe(ne(nutritionTagsTable.family, ROLE_FAMILY)),
      })
      .from(recipesTable)
      .$dynamic();
  }

  private ingredientsOfRecipe(): SQL<RecipeIngredientSnapshot[]> {
    const ingredients = this.database
      .select({
        ingredients: sql`json_agg(json_build_object(
          'foodId', ${recipeIngredientsTable.foodId},
          'grams', ${recipeIngredientsTable.grams},
          'method', ${recipeIngredientsTable.method}
        ) order by ${recipeIngredientsTable.position})`,
      })
      .from(recipeIngredientsTable)
      .where(eq(recipeIngredientsTable.recipeId, recipesTable.id));

    return sql<
      RecipeIngredientSnapshot[]
    >`coalesce((${ingredients}), '[]'::json)`;
  }

  private tagIdsOfRecipe(family: SQL): SQL<string[]> {
    const tagIds = this.database
      .select({ tagId: recipeTagsTable.tagId })
      .from(recipeTagsTable)
      .innerJoin(
        nutritionTagsTable,
        eq(nutritionTagsTable.id, recipeTagsTable.tagId),
      )
      .where(and(eq(recipeTagsTable.recipeId, recipesTable.id), family))
      .orderBy(asc(nutritionTagsTable.displayOrder));

    return sql<string[]>`array(${tagIds})`;
  }

  private async place(
    transaction: DatabaseTransaction,
    recipeId: string,
    ingredients: readonly RecipeIngredientSnapshot[],
  ): Promise<void> {
    if (ingredients.length === 0) return;

    await transaction.insert(recipeIngredientsTable).values(
      ingredients.map((ingredient, position) => ({
        recipeId,
        position,
        ...ingredient,
      })),
    );
  }

  private async tag(
    transaction: DatabaseTransaction,
    recipeId: string,
    tagIds: readonly string[],
  ): Promise<void> {
    if (tagIds.length === 0) return;

    await transaction
      .insert(recipeTagsTable)
      .values(tagIds.map((tagId) => ({ recipeId, tagId })));
  }

  private nameTakenOrRethrow(error: unknown): "name-taken" {
    const nameTaken = isCausedByDatabaseError(
      error,
      ({ code, constraint }) =>
        code === UNIQUE_VIOLATION_CODE &&
        constraint === recipesConstraints.nameUnique,
    );

    if (!nameTaken) {
      throw error;
    }

    return "name-taken";
  }
}
