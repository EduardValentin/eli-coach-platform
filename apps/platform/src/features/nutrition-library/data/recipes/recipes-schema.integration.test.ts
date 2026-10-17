import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const FIRST_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const SECOND_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const FOOD_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const COACH_ACCOUNT_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const OTHER_COACH_ACCOUNT_ID = "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b";

const insertCoachSql = `
  insert into app.accounts (id, auth_subject_id, role) values ($1, $2, 'COACH')
`;

const insertFoodSql = `
  insert into app.foods
    (id, owner_account_id, name, category, icon, kcal, protein, carb, fat, default_portion_grams, created_at, updated_at)
  values
    ($1, $2, 'Oats', 'carb', 'grain', 389, 16.9, 66.3, 6.9, 40, '2026-10-14T09:00:00Z', '2026-10-14T09:00:00Z')
`;

const insertRecipeSql = `
  insert into app.recipes
    (id, owner_account_id, name, prep_minutes, cook_minutes, instructions, icon, archived_at, created_at, updated_at)
  values
    ($1, $2, $3, 5, 10, '', $4, $5, '2026-10-14T09:00:00Z', '2026-10-14T09:00:00Z')
`;

const insertPhotographedRecipeSql = `
  insert into app.recipes
    (id, owner_account_id, name, prep_minutes, cook_minutes, instructions, photo_id, created_at, updated_at)
  values
    ($1, $2, 'Porridge', 5, 10, '', $3, '2026-10-14T09:00:00Z', '2026-10-14T09:00:00Z')
`;

const insertIngredientSql = `
  insert into app.recipe_ingredients (recipe_id, position, food_id, grams, method)
  values ($1, $2, $3, 40, $4)
`;

type RecipeRow = {
  id?: string;
  ownerAccountId?: string;
  name?: string;
  icon?: string | null;
  archivedAt?: string | null;
};

describe.sequential("recipes schema", () => {
  beforeAll(async () => {
    await suite.start();
  });

  beforeEach(async () => {
    await insertCoach(COACH_ACCOUNT_ID);
    await insertCoach(OTHER_COACH_ACCOUNT_ID);
    await suite.postgres.executeSql({
      sql: insertFoodSql,
      values: [FOOD_ID, COACH_ACCOUNT_ID],
    });
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it.each([
    ["the same name", "Porridge"],
    ["a differently cased name", "PORRIDGE"],
    ["a name with surrounding spaces", "  porridge "],
  ])(
    "refuses a second active recipe of the same coach with %s",
    async (_case, name) => {
      // arrange
      await insertRecipe({ name: "Porridge" });

      // act
      const duplicate = insertRecipe({ id: SECOND_ID, name });

      // assert
      await expect(duplicate).rejects.toThrow(/recipes_owner_name_unique/);
      expect(await countRows("app.recipes")).toBe(1);
    },
  );

  it("keeps the same name for recipes of two coaches", async () => {
    // arrange
    await insertRecipe({ name: "Porridge" });

    // act
    await insertRecipe({
      id: SECOND_ID,
      ownerAccountId: OTHER_COACH_ACCOUNT_ID,
      name: "porridge",
    });

    // assert
    expect(await countRows("app.recipes")).toBe(2);
  });

  it("keeps the name of an archived recipe free for a new one", async () => {
    // arrange
    await insertRecipe({
      name: "Porridge",
      archivedAt: "2026-10-15T09:00:00Z",
    });

    // act
    await insertRecipe({ id: SECOND_ID, name: " porridge" });

    // assert
    expect(await countRows("app.recipes")).toBe(2);
  });

  it("keeps a recipe without an icon", async () => {
    // arrange
    const withoutIcon = { icon: null };

    // act
    await insertRecipe(withoutIcon);

    // assert
    expect(await countRows("app.recipes")).toBe(1);
  });

  it("keeps a recipe's photo by the id of its stored file", async () => {
    // arrange
    const photoId = "7a1b0000-0000-4000-8000-000000000001";

    // act
    await suite.postgres.executeSql({
      sql: insertPhotographedRecipeSql,
      values: [FIRST_ID, COACH_ACCOUNT_ID, photoId],
    });

    // assert
    expect(
      await suite.postgres.countRows({
        tableName: "app.recipes",
        values: [photoId],
        whereClause: "photo_id = $1",
      }),
    ).toBe(1);
  });

  it("keeps a recipe without a photo", async () => {
    // arrange
    const withoutIcon = { icon: null };

    // act
    await insertRecipe(withoutIcon);

    // assert
    expect(
      await suite.postgres.countRows({
        tableName: "app.recipes",
        values: [],
        whereClause: "photo_id is null",
      }),
    ).toBe(1);
  });

  it("refuses a photo id that is no uuid", async () => {
    // arrange
    const photoId = "photo-1";

    // act
    const inserting = suite.postgres.executeSql({
      sql: insertPhotographedRecipeSql,
      values: [FIRST_ID, COACH_ACCOUNT_ID, photoId],
    });

    // assert
    await expect(inserting).rejects.toThrow(/uuid/);
    expect(await countRows("app.recipes")).toBe(0);
  });

  it("refuses an icon outside the meal icons", async () => {
    // arrange
    const unknown = { icon: "burger" };

    // act
    const inserting = insertRecipe(unknown);

    // assert
    await expect(inserting).rejects.toThrow(/recipes_icon_check/);
    expect(await countRows("app.recipes")).toBe(0);
  });

  it("refuses a cooking method outside the vocabulary", async () => {
    // arrange
    await insertRecipe({});

    // act
    const placing = placeIngredient({ position: 0, method: "fried" });

    // assert
    await expect(placing).rejects.toThrow(/recipe_ingredients_method_check/);
  });

  it("refuses two ingredients at the same position of a recipe", async () => {
    // arrange
    await insertRecipe({});
    await placeIngredient({ position: 0, method: "raw" });

    // act
    const placing = placeIngredient({ position: 0, method: "boiled" });

    // assert
    await expect(placing).rejects.toThrow(/recipe_ingredients_pkey/);
  });

  it("refuses to remove a food a recipe uses", async () => {
    // arrange
    await insertRecipe({});
    await placeIngredient({ position: 0, method: "raw" });

    // act
    const removing = suite.postgres.executeSql({
      sql: "delete from app.foods where id = $1",
      values: [FOOD_ID],
    });

    // assert
    await expect(removing).rejects.toThrow(
      /recipe_ingredients_food_id_foods_id_fk/,
    );
    expect(await countRows("app.foods")).toBe(1);
  });

  it("removes a recipe's ingredients and tags with the recipe", async () => {
    // arrange
    await insertRecipe({});
    await placeIngredient({ position: 0, method: "raw" });
    await placeIngredient({ position: 1, method: "baked" });
    await suite.postgres.executeSql({
      sql: `insert into app.recipe_tags (recipe_id, tag_id) values ($1, 'mt-breakfast'), ($1, 'di-vegetarian')`,
      values: [FIRST_ID],
    });

    // act
    await suite.postgres.executeSql({
      sql: "delete from app.recipes where id = $1",
      values: [FIRST_ID],
    });

    // assert
    expect(await countRows("app.recipe_ingredients")).toBe(0);
    expect(await countRows("app.recipe_tags")).toBe(0);
    expect(await countRows("app.foods")).toBe(1);
  });

  it("refuses a tag outside the vocabulary on a recipe", async () => {
    // arrange
    await insertRecipe({});

    // act
    const tagging = suite.postgres.executeSql({
      sql: `insert into app.recipe_tags (recipe_id, tag_id) values ($1, 'mt-brunch')`,
      values: [FIRST_ID],
    });

    // assert
    await expect(tagging).rejects.toThrow(
      /recipe_tags_tag_id_nutrition_tags_id_fk/,
    );
  });
});

function insertRecipe(row: RecipeRow): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertRecipeSql,
    values: [
      row.id ?? FIRST_ID,
      row.ownerAccountId ?? COACH_ACCOUNT_ID,
      row.name ?? "Porridge",
      row.icon === undefined ? "pot" : row.icon,
      row.archivedAt ?? null,
    ],
  });
}

function placeIngredient(ingredient: {
  position: number;
  method: string;
}): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertIngredientSql,
    values: [FIRST_ID, ingredient.position, FOOD_ID, ingredient.method],
  });
}

function insertCoach(accountId: string): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertCoachSql,
    values: [accountId, `user_${accountId}`],
  });
}

function countRows(tableName: string): Promise<number> {
  return suite.postgres.countRows({
    tableName,
    values: [],
    whereClause: "true",
  });
}
