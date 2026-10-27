import type { DatabaseClient } from "~/shared/database";
import {
  Exercise,
  InvalidStoredExerciseError,
  type ExerciseSnapshot,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import { describe, expect, it } from "vitest";

import { exercisesTable } from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/schema.server";

import { PostgresExerciseLibrary } from "./exercise-library-repository.server";

const AT = new Date("2026-10-14T09:00:00.000Z");
const LATER = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";

const SQUAT: ExerciseSnapshot = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell"],
  difficulty: "Intermediate",
  tags: ["Strength"],
  cues: "Brace.",
  video: null,
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const VIDEO_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";

const SQUAT_ROW = {
  id: SQUAT.id,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Back squat",
  formCues: "Brace.",
  type: "resistance",
  unit: "reps",
  perSide: false,
  difficulty: "Intermediate",
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell"],
  tags: ["Strength"],
  videoId: null,
  videoFormat: null,
  videoSizeBytes: null,
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const NAME_TAKEN = Object.assign(new Error("Failed query"), {
  cause: Object.assign(new Error("duplicate key value"), {
    code: "23505",
    constraint: "exercises_owner_name_unique",
  }),
});

const OTHER_UNIQUE_VIOLATION = Object.assign(new Error("Failed query"), {
  cause: Object.assign(new Error("duplicate key value"), {
    code: "23505",
    constraint: "exercises_pkey",
  }),
});

type Write =
  { insert: unknown; row: unknown } | { update: unknown; row: unknown };

function createDatabase(failure?: Error, rows: unknown[] = []) {
  const writes: Write[] = [];
  const settle = () => (failure ? Promise.reject(failure) : Promise.resolve());
  const client = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(rows),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (row: unknown) => {
        writes.push({ insert: table, row });
        return settle();
      },
    }),
    update: (table: unknown) => ({
      set: (row: unknown) => ({
        where: () => {
          writes.push({ update: table, row });
          return settle();
        },
      }),
    }),
  } as unknown as DatabaseClient;

  return { client, writes };
}

describe("PostgresExerciseLibrary#add", () => {
  it("inserts the exercise with its form cues in their own column and answers that it was added", async () => {
    // arrange
    const database = createDatabase();
    const library = new PostgresExerciseLibrary(database.client);

    // act
    const answer = await library.add(Exercise.reconstitute(SQUAT));

    // assert
    expect(answer).toBe("added");
    expect(database.writes).toEqual([
      { insert: exercisesTable, row: SQUAT_ROW },
    ]);
  });

  it("writes the exercise's video in its video id, format and size columns", async () => {
    // arrange
    const database = createDatabase();
    const library = new PostgresExerciseLibrary(database.client);
    const withVideo = Exercise.reconstitute({
      ...SQUAT,
      video: { videoId: VIDEO_ID, format: "mov", sizeBytes: 4_096 },
    });

    // act
    await library.add(withVideo);

    // assert
    expect(database.writes).toEqual([
      {
        insert: exercisesTable,
        row: {
          ...SQUAT_ROW,
          videoId: VIDEO_ID,
          videoFormat: "mov",
          videoSizeBytes: 4_096,
        },
      },
    ]);
  });

  it("answers that the name is taken when the unique name index refuses the row", async () => {
    // arrange
    const database = createDatabase(NAME_TAKEN);
    const library = new PostgresExerciseLibrary(database.client);

    // act
    const answer = await library.add(Exercise.reconstitute(SQUAT));

    // assert
    expect(answer).toBe("name-taken");
  });

  it("passes any other refusal on", async () => {
    // arrange
    const database = createDatabase(OTHER_UNIQUE_VIOLATION);
    const library = new PostgresExerciseLibrary(database.client);

    // act
    const adding = library.add(Exercise.reconstitute(SQUAT));

    // assert
    await expect(adding).rejects.toBe(OTHER_UNIQUE_VIOLATION);
  });
});

describe("PostgresExerciseLibrary#list", () => {
  it("reads a row's video columns back as its video, and empty columns as none", async () => {
    // arrange
    const database = createDatabase(undefined, [
      SQUAT_ROW,
      {
        ...SQUAT_ROW,
        videoId: VIDEO_ID,
        videoFormat: "mp4",
        videoSizeBytes: 2_048,
      },
    ]);
    const library = new PostgresExerciseLibrary(database.client);

    // act
    const exercises = await library.list(COACH_ACCOUNT_ID);

    // assert
    expect(exercises.map((exercise) => exercise.toSnapshot().video)).toEqual([
      null,
      { videoId: VIDEO_ID, format: "mp4", sizeBytes: 2_048 },
    ]);
  });

  it("refuses a stored row that breaks an exercise rule instead of answering it", async () => {
    // arrange
    const database = createDatabase(undefined, [
      { ...SQUAT_ROW, unit: "breaths" },
    ]);
    const library = new PostgresExerciseLibrary(database.client);

    // act
    const listing = library.list(COACH_ACCOUNT_ID);

    // assert
    await expect(listing).rejects.toThrow(InvalidStoredExerciseError);
  });
});

describe("PostgresExerciseLibrary#replace", () => {
  it("writes every field but the id, the owner and the moment it was created, and answers that it was replaced", async () => {
    // arrange
    const database = createDatabase();
    const library = new PostgresExerciseLibrary(database.client);
    const revised = Exercise.reconstitute({
      ...SQUAT,
      name: "Front squat",
      updatedAt: LATER,
    });

    // act
    const answer = await library.replace(revised);

    // assert
    const {
      id: _id,
      ownerAccountId: _ownerAccountId,
      createdAt: _createdAt,
      ...columns
    } = SQUAT_ROW;
    expect(answer).toBe("replaced");
    expect(database.writes).toEqual([
      {
        update: exercisesTable,
        row: { ...columns, name: "Front squat", updatedAt: LATER },
      },
    ]);
  });

  it("answers that the name is taken when the unique name index refuses the rename", async () => {
    // arrange
    const database = createDatabase(NAME_TAKEN);
    const library = new PostgresExerciseLibrary(database.client);

    // act
    const answer = await library.replace(Exercise.reconstitute(SQUAT));

    // assert
    expect(answer).toBe("name-taken");
  });

  it("passes any other failure on", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const database = createDatabase(failure);
    const library = new PostgresExerciseLibrary(database.client);

    // act
    const replacing = library.replace(Exercise.reconstitute(SQUAT));

    // assert
    await expect(replacing).rejects.toBe(failure);
  });
});
