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
const NO_ACCOUNT_ID = "7f6e5d4c-3b2a-4f1e-8d9c-8b7a6f5e4d3c";

const insertCoachSql = `
  insert into app.accounts (id, auth_subject_id, role) values ($1, $2, 'COACH')
`;

const insertExerciseSql = `
  insert into app.exercises
    (id, owner_account_id, name, form_cues, type, unit, per_side, difficulty, primary_muscles, secondary_muscles, equipment, tags, created_at, updated_at)
  values
    ($1, $2, $3, '', $4, $5, false, $6, '{Glutes}', '{}', '{}', '{}', '2026-10-14T09:00:00Z', '2026-10-14T09:00:00Z')
`;

type ExerciseRow = {
  id?: string;
  ownerAccountId?: string | null;
  name?: string;
  type?: string;
  unit?: string;
  difficulty?: string;
};

describe.sequential("exercises schema", () => {
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

  it("keeps two exercises with different names", async () => {
    // arrange
    await insertExercise({ name: "Hip thrust" });

    // act
    await insertExercise({ id: SECOND_ID, name: "Hip thrusts" });

    // assert
    expect(await countExercises()).toBe(2);
  });

  it.each([
    ["the same name", "Hip thrust"],
    ["a differently cased name", "HIP THRUST"],
    ["a name with surrounding spaces", "  hip Thrust "],
  ])(
    "refuses a second exercise of the same coach with %s",
    async (_case, name) => {
      // arrange
      await insertExercise({ name: "Hip thrust" });

      // act
      const duplicate = insertExercise({ id: SECOND_ID, name });

      // assert
      await expect(duplicate).rejects.toThrow(/exercises_owner_name_unique/);
      expect(await countExercises()).toBe(1);
    },
  );

  it("keeps the same name for exercises of two coaches", async () => {
    // arrange
    await insertExercise({ name: "Hip thrust" });

    // act
    await insertExercise({
      id: SECOND_ID,
      ownerAccountId: OTHER_COACH_ACCOUNT_ID,
      name: "hip thrust",
    });

    // assert
    expect(await countExercises()).toBe(2);
  });

  it.each([
    ["no owner", null, /owner_account_id/],
    [
      "an owner that is no account",
      NO_ACCOUNT_ID,
      /exercises_owner_account_id_accounts_id_fk/,
    ],
  ])("refuses an exercise with %s", async (_case, ownerAccountId, problem) => {
    // arrange
    const exerciseWithBadOwner = { ownerAccountId };

    // act
    const inserting = insertExercise(exerciseWithBadOwner);

    // assert
    await expect(inserting).rejects.toThrow(problem);
    expect(await countExercises()).toBe(0);
  });

  it.each([
    ["type", { type: "yoga" }, /exercises_type_check/],
    ["unit", { unit: "laps" }, /exercises_unit_check/],
    ["difficulty", { difficulty: "Expert" }, /exercises_difficulty_check/],
  ])(
    "refuses a %s outside the library's vocabulary",
    async (_case, row, constraint) => {
      // arrange
      const unknown = row;

      // act
      const inserting = insertExercise(unknown);

      // assert
      await expect(inserting).rejects.toThrow(constraint);
      expect(await countExercises()).toBe(0);
    },
  );

  it("refuses a name longer than 80 characters", async () => {
    // arrange
    const name = "n".repeat(81);

    // act
    const inserting = insertExercise({ name });

    // assert
    await expect(inserting).rejects.toThrow(/too long/);
    expect(await countExercises()).toBe(0);
  });
});

function insertExercise(row: ExerciseRow): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertExerciseSql,
    values: [
      row.id ?? FIRST_ID,
      row.ownerAccountId === undefined ? COACH_ACCOUNT_ID : row.ownerAccountId,
      row.name ?? "Hip thrust",
      row.type ?? "resistance",
      row.unit ?? "reps",
      row.difficulty ?? "Beginner",
    ],
  });
}

function insertCoach(accountId: string): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: insertCoachSql,
    values: [accountId, `user_${accountId}`],
  });
}

function countExercises(): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.exercises",
    values: [],
    whereClause: "true",
  });
}
