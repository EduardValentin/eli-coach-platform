import type { DatabaseClient } from "~/shared/database";
import {
  Exercise,
  InvalidStoredExerciseError,
  type ExerciseSnapshot,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import { describe, expect, it } from "vitest";

import {
  exerciseProgramUsagesTable,
  exercisesTable,
} from "~/bounded-contexts/programs/exercise-library/adapters/outbound/persistence/schema.server";

import { PostgresExerciseLibraryRepository } from "./postgres-exercise-library-repository.server";

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
  pattern: "squat",
  role: "main-compound",
  tags: ["Strength"],
  cues: "Brace.",
  video: null,
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const VIDEO_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const LUNGE_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const PROGRAM_ID = "8a7f6e5d-4c3b-4a2f-9e1d-0c9b8a7f6e5d";

const SQUAT_ROW = {
  id: SQUAT.id,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Back squat",
  formCues: "Brace.",
  type: "resistance",
  unit: "reps",
  perSide: false,
  difficulty: "Intermediate",
  pattern: "squat",
  role: "main-compound",
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
  | { insert: unknown; row: unknown }
  | { update: unknown; row: unknown }
  | { delete: unknown };

function createDatabase(failure?: Error, rows: unknown[] = []) {
  const writes: Write[] = [];
  const settle = () => (failure ? Promise.reject(failure) : Promise.resolve());
  const client = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(rows),
        }),
        innerJoin: () => ({
          where: () => ({
            groupBy: () => Promise.resolve(rows),
          }),
        }),
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        writes.push({ delete: table });
        return settle();
      },
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

describe("PostgresExerciseLibraryRepository#add", () => {
  it("inserts the exercise with its form cues in their own column and answers that it was added", async () => {
    // arrange
    const database = createDatabase();
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const answer = await postgresExerciseLibraryRepository.add(
      Exercise.reconstitute(SQUAT),
    );

    // assert
    expect(answer).toBe("added");
    expect(database.writes).toEqual([
      { insert: exercisesTable, row: SQUAT_ROW },
    ]);
  });

  it("writes the exercise's video in its video id, format and size columns", async () => {
    // arrange
    const database = createDatabase();
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);
    const withVideo = Exercise.reconstitute({
      ...SQUAT,
      video: { videoId: VIDEO_ID, format: "mov", sizeBytes: 4_096 },
    });

    // act
    await postgresExerciseLibraryRepository.add(withVideo);

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
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const answer = await postgresExerciseLibraryRepository.add(
      Exercise.reconstitute(SQUAT),
    );

    // assert
    expect(answer).toBe("name-taken");
  });

  it("passes any other refusal on", async () => {
    // arrange
    const database = createDatabase(OTHER_UNIQUE_VIOLATION);
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const adding = postgresExerciseLibraryRepository.add(
      Exercise.reconstitute(SQUAT),
    );

    // assert
    await expect(adding).rejects.toBe(OTHER_UNIQUE_VIOLATION);
  });
});

describe("PostgresExerciseLibraryRepository#list", () => {
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
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const exercises =
      await postgresExerciseLibraryRepository.list(COACH_ACCOUNT_ID);

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
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const listing = postgresExerciseLibraryRepository.list(COACH_ACCOUNT_ID);

    // assert
    await expect(listing).rejects.toThrow(InvalidStoredExerciseError);
  });
});

describe("PostgresExerciseLibraryRepository#replace", () => {
  it("writes every field but the id, the owner and the moment it was created, and answers that it was replaced", async () => {
    // arrange
    const database = createDatabase();
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);
    const revised = Exercise.reconstitute({
      ...SQUAT,
      name: "Front squat",
      updatedAt: LATER,
    });

    // act
    const answer = await postgresExerciseLibraryRepository.replace(revised);

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
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const answer = await postgresExerciseLibraryRepository.replace(
      Exercise.reconstitute(SQUAT),
    );

    // assert
    expect(answer).toBe("name-taken");
  });

  it("passes any other failure on", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const database = createDatabase(failure);
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const replacing = postgresExerciseLibraryRepository.replace(
      Exercise.reconstitute(SQUAT),
    );

    // assert
    await expect(replacing).rejects.toBe(failure);
  });
});

describe("PostgresExerciseLibraryRepository#replaceVersionUsage", () => {
  it("removes what the program version used before, then records each exercise it uses now", async () => {
    // arrange
    const database = createDatabase();
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    await postgresExerciseLibraryRepository.replaceVersionUsage({
      programId: PROGRAM_ID,
      versionNumber: 2,
      exerciseIds: [SQUAT.id, LUNGE_ID],
    });

    // assert
    expect(database.writes).toEqual([
      { delete: exerciseProgramUsagesTable },
      {
        insert: exerciseProgramUsagesTable,
        row: [
          { exerciseId: SQUAT.id, programId: PROGRAM_ID, versionNumber: 2 },
          { exerciseId: LUNGE_ID, programId: PROGRAM_ID, versionNumber: 2 },
        ],
      },
    ]);
  });

  it("only removes what the program version used before when it uses no exercise now", async () => {
    // arrange
    const database = createDatabase();
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    await postgresExerciseLibraryRepository.replaceVersionUsage({
      programId: PROGRAM_ID,
      versionNumber: 1,
      exerciseIds: [],
    });

    // assert
    expect(database.writes).toEqual([{ delete: exerciseProgramUsagesTable }]);
  });
});

describe("PostgresExerciseLibraryRepository#programCountsOf", () => {
  it("answers how many programs use each of her exercises", async () => {
    // arrange
    const database = createDatabase(undefined, [
      { exerciseId: SQUAT.id, programCount: 2 },
      { exerciseId: LUNGE_ID, programCount: 1 },
    ]);
    const postgresExerciseLibraryRepository =
      new PostgresExerciseLibraryRepository(database.client);

    // act
    const counts =
      await postgresExerciseLibraryRepository.programCountsOf(COACH_ACCOUNT_ID);

    // assert
    expect(counts).toEqual(
      new Map([
        [SQUAT.id, 2],
        [LUNGE_ID, 1],
      ]),
    );
  });
});
