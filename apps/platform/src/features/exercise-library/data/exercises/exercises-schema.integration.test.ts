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
const VIDEO_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const COACH_ACCOUNT_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const OTHER_COACH_ACCOUNT_ID = "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b";
const NO_ACCOUNT_ID = "7f6e5d4c-3b2a-4f1e-8d9c-8b7a6f5e4d3c";

const insertCoachSql = `
  insert into app.accounts (id, auth_subject_id, role) values ($1, $2, 'COACH')
`;

const insertExerciseSql = `
  insert into app.exercises
    (id, owner_account_id, name, form_cues, type, unit, per_side, difficulty, primary_muscles, secondary_muscles, equipment, tags, video_file_id, video_format, video_size_bytes, archived_at, created_at, updated_at)
  values
    ($1, $2, $3, $10, $4, $5, false, $6, $11, $12, $13, $14, $7, $8, $9, $15, '2026-10-14T09:00:00Z', '2026-10-14T09:00:00Z')
`;

type ExerciseRow = {
  id?: string;
  ownerAccountId?: string | null;
  name?: string;
  type?: string;
  unit?: string;
  difficulty?: string;
  cues?: string;
  primaryMuscles?: (string | null)[];
  secondaryMuscles?: (string | null)[];
  equipment?: (string | null)[];
  tags?: (string | null)[];
  video?: { videoId?: string; format?: string; sizeBytes?: number };
  archivedAt?: string | null;
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const UPDATABLE_COLUMNS = {
  name: "name",
  formCues: "form_cues",
  type: "type",
  primaryMuscles: "primary_muscles",
  secondaryMuscles: "secondary_muscles",
  equipment: "equipment",
  tags: "tags",
  videoSizeBytes: "video_size_bytes",
} as const;

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

  it("keeps the name of an archived exercise free for a new one", async () => {
    // arrange
    await insertExercise({
      name: "Hip thrust",
      archivedAt: "2026-10-15T09:00:00Z",
    });

    // act
    await insertExercise({ id: SECOND_ID, name: "hip thrust" });

    // assert
    expect(await countExercises()).toBe(2);
  });

  it("keeps two archived exercises of the same coach under the same name", async () => {
    // arrange
    await insertExercise({
      name: "Hip thrust",
      archivedAt: "2026-10-15T09:00:00Z",
    });

    // act
    await insertExercise({
      id: SECOND_ID,
      name: "Hip thrust",
      archivedAt: "2026-10-16T09:00:00Z",
    });

    // assert
    expect(await countExercises()).toBe(2);
  });

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

  it("keeps an exercise with a whole video", async () => {
    // arrange
    const video = { videoId: VIDEO_ID, format: "mp4", sizeBytes: 2_048 };

    // act
    await insertExercise({ video });

    // assert
    expect(await countExercises()).toBe(1);
  });

  it.each([
    ["a video id without its format and size", { videoId: VIDEO_ID }],
    [
      "a format and size without a video id",
      { format: "mp4", sizeBytes: 2_048 },
    ],
    [
      "a video id and format without a size",
      { videoId: VIDEO_ID, format: "mov" },
    ],
  ])("refuses %s", async (_case, video) => {
    // arrange
    const partial = video;

    // act
    const inserting = insertExercise({ video: partial });

    // assert
    await expect(inserting).rejects.toThrow(/exercises_video_complete_check/);
    expect(await countExercises()).toBe(0);
  });

  it("refuses a video format outside .mp4 and .mov", async () => {
    // arrange
    const video = { videoId: VIDEO_ID, format: "webm", sizeBytes: 2_048 };

    // act
    const inserting = insertExercise({ video });

    // assert
    await expect(inserting).rejects.toThrow(/exercises_video_format_check/);
    expect(await countExercises()).toBe(0);
  });

  it.each([
    [
      "a cardio exercise without a primary muscle",
      { type: "cardio", unit: "time", primaryMuscles: [] },
    ],
    ["an 80-character name", { name: "n".repeat(80) }],
    ["1,000 characters of form cues", { cues: "c".repeat(1_000) }],
    [
      "every list within its vocabulary",
      {
        primaryMuscles: ["Glutes", "Hamstrings"],
        secondaryMuscles: ["Core"],
        equipment: ["Barbell", "Bench"],
        tags: ["Strength", "Recovery"],
      },
    ],
    [
      "a video of one byte",
      { video: { videoId: VIDEO_ID, format: "mov", sizeBytes: 1 } },
    ],
    [
      "a video of exactly 50 MB",
      {
        video: { videoId: VIDEO_ID, format: "mp4", sizeBytes: MAX_VIDEO_BYTES },
      },
    ],
  ])("keeps %s", async (_case, row) => {
    // arrange
    const valid = row;

    // act
    await insertExercise(valid);

    // assert
    expect(await countExercises()).toBe(1);
  });

  it.each([
    ["an empty name", { name: "" }, /exercises_name_check/],
    ["a blank name", { name: "   " }, /exercises_name_check/],
    [
      "a name with surrounding spaces",
      { name: " Hip thrust " },
      /exercises_name_check/,
    ],
    [
      "form cues over 1,000 characters",
      { cues: "c".repeat(1_001) },
      /exercises_form_cues_check/,
    ],
    [
      "a unit its type does not allow",
      { type: "stretching", unit: "reps" },
      /exercises_unit_for_type_check/,
    ],
    [
      "no primary muscle for a type other than cardio",
      { primaryMuscles: [] },
      /exercises_primary_muscle_check/,
    ],
    [
      "an unknown primary muscle",
      { primaryMuscles: ["Wings"] },
      /exercises_primary_muscles_vocabulary_check/,
    ],
    [
      "an empty primary muscle",
      { primaryMuscles: [null] },
      /exercises_primary_muscles_vocabulary_check/,
    ],
    [
      "an unknown secondary muscle",
      { secondaryMuscles: ["Wings"] },
      /exercises_secondary_muscles_vocabulary_check/,
    ],
    [
      "a secondary muscle that is also primary",
      { secondaryMuscles: ["Glutes"] },
      /exercises_muscles_overlap_check/,
    ],
    [
      "unknown equipment",
      { equipment: ["Sled"] },
      /exercises_equipment_vocabulary_check/,
    ],
    ["an unknown tag", { tags: ["Power"] }, /exercises_tags_vocabulary_check/],
    [
      "a video of no bytes",
      { video: { videoId: VIDEO_ID, format: "mp4", sizeBytes: 0 } },
      /exercises_video_size_check/,
    ],
    [
      "a video of a negative size",
      { video: { videoId: VIDEO_ID, format: "mp4", sizeBytes: -1 } },
      /exercises_video_size_check/,
    ],
    [
      "a video over 50 MB",
      {
        video: {
          videoId: VIDEO_ID,
          format: "mp4",
          sizeBytes: MAX_VIDEO_BYTES + 1,
        },
      },
      /exercises_video_size_check/,
    ],
  ])("refuses an exercise with %s", async (_case, row, constraint) => {
    // arrange
    const invalid = row;

    // act
    const inserting = insertExercise(invalid);

    // assert
    await expect(inserting).rejects.toThrow(constraint);
    expect(await countExercises()).toBe(0);
  });

  it.each([
    ["its name to a blank one", "name", "  ", /exercises_name_check/],
    [
      "its form cues past 1,000 characters",
      "formCues",
      "c".repeat(1_001),
      /exercises_form_cues_check/,
    ],
    [
      "its type to one its unit does not suit",
      "type",
      "breathing",
      /exercises_unit_for_type_check/,
    ],
    [
      "its primary muscles to none",
      "primaryMuscles",
      [],
      /exercises_primary_muscle_check/,
    ],
    [
      "a primary muscle to an unknown one",
      "primaryMuscles",
      ["Wings"],
      /exercises_primary_muscles_vocabulary_check/,
    ],
    [
      "a secondary muscle to its primary one",
      "secondaryMuscles",
      ["Glutes"],
      /exercises_muscles_overlap_check/,
    ],
    [
      "its equipment to an unknown piece",
      "equipment",
      ["Sled"],
      /exercises_equipment_vocabulary_check/,
    ],
    [
      "a tag to an unknown one",
      "tags",
      ["Power"],
      /exercises_tags_vocabulary_check/,
    ],
    [
      "its video's size to nothing",
      "videoSizeBytes",
      0,
      /exercises_video_size_check/,
    ],
  ] as const)(
    "refuses changing a stored exercise's %s",
    async (_case, column, value, constraint) => {
      // arrange
      await insertExercise({
        video: { videoId: VIDEO_ID, format: "mp4", sizeBytes: 2_048 },
      });

      // act
      const updating = updateExercise(column, value);

      // assert
      await expect(updating).rejects.toThrow(constraint);
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
      row.video?.videoId ?? null,
      row.video?.format ?? null,
      row.video?.sizeBytes ?? null,
      row.cues ?? "",
      row.primaryMuscles ?? ["Glutes"],
      row.secondaryMuscles ?? [],
      row.equipment ?? [],
      row.tags ?? [],
      row.archivedAt ?? null,
    ],
  });
}

function updateExercise(
  column: keyof typeof UPDATABLE_COLUMNS,
  value: unknown,
): Promise<unknown> {
  return suite.postgres.executeSql({
    sql: `update app.exercises set ${UPDATABLE_COLUMNS[column]} = $1 where id = $2`,
    values: [value, FIRST_ID],
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
