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
const COACH_ACCOUNT_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const OTHER_COACH_ACCOUNT_ID = "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b";

const insertCoachSql = `
  insert into app.accounts (id, auth_subject_id, role) values ($1, $2, 'COACH')
`;

const insertFoodSql = `
  insert into app.foods
    (id, owner_account_id, name, category, icon, kcal, protein, carb, fat, default_portion_grams, archived_at, created_at, updated_at)
  values
    ($1, $2, $3, $4, $5, 165, 31, 0, 3.6, 100, $6, '2026-10-14T09:00:00Z', '2026-10-14T09:00:00Z')
`;

type FoodRow = {
  id?: string;
  ownerAccountId?: string;
  name?: string;
  category?: string;
  icon?: string;
  archivedAt?: string | null;
};

describe.sequential("foods schema", () => {
  beforeAll(async () => {
    await suite.start();
  });

  beforeEach(async () => {
    await insertCoach(COACH_ACCOUNT_ID);
    await insertCoach(OTHER_COACH_ACCOUNT_ID);
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("holds the sixteen tags of the vocabulary in their families and display order", async () => {
    // arrange
    const selectTags =
      "select id, family, label from app.nutrition_tags order by display_order";

    // act
    const tags = await suite.postgres.queryRows<{
      id: string;
      family: string;
      label: string;
    }>({ sql: selectTags, values: [] });

    // assert
    expect(tags.map(({ id, family, label }) => [id, family, label])).toEqual([
      ["mt-breakfast", "meal-time", "Breakfast"],
      ["mt-lunch", "meal-time", "Lunch"],
      ["mt-dinner", "meal-time", "Dinner"],
      ["mt-snack", "meal-time", "Snack"],
      ["mt-pre-workout", "meal-time", "Pre-workout"],
      ["mt-post-workout", "meal-time", "Post-workout"],
      ["cp-menstrual", "cycle-phase", "Menstrual"],
      ["cp-follicular", "cycle-phase", "Follicular"],
      ["cp-ovulatory", "cycle-phase", "Ovulatory"],
      ["cp-luteal", "cycle-phase", "Luteal"],
      ["nu-iron", "nutrient", "Iron-rich"],
      ["nu-omega3", "nutrient", "Omega-3"],
      ["nu-magnesium", "nutrient", "Magnesium"],
      ["nu-anti-inflammatory", "nutrient", "Anti-inflammatory"],
      ["di-vegetarian", "dietary", "Vegetarian"],
      ["di-lactose-free", "dietary", "Lactose-free"],
    ]);
  });

  it.each([
    ["the same name", "Chicken breast"],
    ["a differently cased name", "CHICKEN BREAST"],
    ["a name with surrounding spaces", "  chicken Breast "],
  ])(
    "refuses a second active food of the same coach with %s",
    async (_case, name) => {
      // arrange
      await insertFood({ name: "Chicken breast" });

      // act
      const duplicate = insertFood({ id: SECOND_ID, name });

      // assert
      await expect(duplicate).rejects.toThrow(/foods_owner_name_unique/);
      expect(await countFoods()).toBe(1);
    },
  );

  it("keeps the same name for foods of two coaches", async () => {
    // arrange
    await insertFood({ name: "Chicken breast" });

    // act
    await insertFood({
      id: SECOND_ID,
      ownerAccountId: OTHER_COACH_ACCOUNT_ID,
      name: "chicken breast",
    });

    // assert
    expect(await countFoods()).toBe(2);
  });

  it("keeps the name of an archived food free for a new one", async () => {
    // arrange
    await insertFood({
      name: "Chicken breast",
      archivedAt: "2026-10-15T09:00:00Z",
    });

    // act
    await insertFood({ id: SECOND_ID, name: " chicken breast" });

    // assert
    expect(await countFoods()).toBe(2);
  });

  it.each([
    ["category", { category: "dessert" }, /foods_category_check/],
    ["icon", { icon: "pizza" }, /foods_icon_check/],
  ])(
    "refuses a %s outside the library's vocabulary",
    async (_case, row, constraint) => {
      // arrange
      const unknown = row;

      // act
      const inserting = insertFood(unknown);

      // assert
      await expect(inserting).rejects.toThrow(constraint);
      expect(await countFoods()).toBe(0);
    },
  );

  it("refuses a tag of an unknown family", async () => {
    // arrange
    const insertTag = `insert into app.nutrition_tags (id, family, label, display_order) values ('xx-brunch', 'meal', 'Brunch', 17)`;

    // act
    const inserting = suite.postgres.executeSql({ sql: insertTag });

    // assert
    await expect(inserting).rejects.toThrow(/nutrition_tags_family_check/);
  });

  it("removes a food's tags with the food", async () => {
    // arrange
    await insertFood({});
    await suite.postgres.executeSql({
      sql: `insert into app.food_tags (food_id, tag_id) values ($1, 'mt-lunch'), ($1, 'di-lactose-free')`,
      values: [FIRST_ID],
    });

    // act
    await suite.postgres.executeSql({
      sql: "delete from app.foods where id = $1",
      values: [FIRST_ID],
    });

    // assert
    expect(
      await suite.postgres.countRows({
        tableName: "app.food_tags",
        values: [],
        whereClause: "true",
      }),
    ).toBe(0);
  });

  it("refuses a tag outside the vocabulary on a food", async () => {
    // arrange
    await insertFood({});

    // act
    const tagging = suite.postgres.executeSql({
      sql: `insert into app.food_tags (food_id, tag_id) values ($1, 'mt-brunch')`,
      values: [FIRST_ID],
    });

    // assert
    await expect(tagging).rejects.toThrow(
      /food_tags_tag_id_nutrition_tags_id_fk/,
    );
  });
});

function insertFood(row: FoodRow): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertFoodSql,
    values: [
      row.id ?? FIRST_ID,
      row.ownerAccountId ?? COACH_ACCOUNT_ID,
      row.name ?? "Chicken breast",
      row.category ?? "protein",
      row.icon ?? "poultry",
      row.archivedAt ?? null,
    ],
  });
}

function insertCoach(accountId: string): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertCoachSql,
    values: [accountId, `user_${accountId}`],
  });
}

function countFoods(): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.foods",
    values: [],
    whereClause: "true",
  });
}
