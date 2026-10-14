import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "@eli-coach-platform/db";
import {
  Exercise,
  type ExerciseAddition,
  type ExerciseLibrary,
  type ExerciseReplacement,
} from "@eli-coach-platform/domain/exercise";
import { asc, eq, sql } from "drizzle-orm";

import {
  exercisesConstraints,
  exercisesTable,
} from "~/features/exercise-library/data/schema.server";

type ExerciseRow = typeof exercisesTable.$inferSelect;

const UNIQUE_VIOLATION_CODE = "23505";

export class PostgresExerciseLibrary implements ExerciseLibrary {
  constructor(private readonly database: DatabaseClient) {}

  async list(): Promise<Exercise[]> {
    const rows = await this.database
      .select()
      .from(exercisesTable)
      .orderBy(asc(sql`lower(${exercisesTable.name})`), asc(exercisesTable.id));

    return rows.map((row) => this.exerciseOf(row));
  }

  async find(exerciseId: string): Promise<Exercise | null> {
    const [row] = await this.database
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exerciseId))
      .limit(1);

    return row ? this.exerciseOf(row) : null;
  }

  async add(exercise: Exercise): Promise<ExerciseAddition> {
    try {
      await this.database.insert(exercisesTable).values(this.rowOf(exercise));

      return "added";
    } catch (error) {
      return this.nameTakenOrRethrow(error);
    }
  }

  async replace(exercise: Exercise): Promise<ExerciseReplacement> {
    const { id, createdAt: _createdAt, ...columns } = this.rowOf(exercise);

    try {
      await this.database
        .update(exercisesTable)
        .set(columns)
        .where(eq(exercisesTable.id, id));

      return "replaced";
    } catch (error) {
      return this.nameTakenOrRethrow(error);
    }
  }

  private nameTakenOrRethrow(error: unknown): "name-taken" {
    const nameTaken = isCausedByDatabaseError(
      error,
      ({ code, constraint }) =>
        code === UNIQUE_VIOLATION_CODE &&
        constraint === exercisesConstraints.nameUnique,
    );

    if (!nameTaken) {
      throw error;
    }

    return "name-taken";
  }

  private rowOf(exercise: Exercise): ExerciseRow {
    const { cues, ...snapshot } = exercise.toSnapshot();

    return { ...snapshot, formCues: cues };
  }

  private exerciseOf({ formCues, ...row }: ExerciseRow): Exercise {
    return Exercise.reconstitute({ ...row, cues: formCues });
  }
}
