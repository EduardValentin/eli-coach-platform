import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import {
  Exercise,
  type ExerciseAddition,
  type ExerciseLibrary,
  type ExerciseReference,
  type ExerciseRemoval,
  type ExerciseReplacement,
  type ExerciseVideoSnapshot,
} from "@eli-coach-platform/domain/exercise";
import { and, asc, eq, sql } from "drizzle-orm";

import {
  exercisesConstraints,
  exercisesTable,
} from "~/bounded-contexts/programs/exercise-library/data/schema.server";

type ExerciseRow = typeof exercisesTable.$inferSelect;

const UNIQUE_VIOLATION_CODE = "23505";

export class PostgresExerciseLibrary implements ExerciseLibrary {
  constructor(private readonly database: DatabaseClient) {}

  async list(ownerAccountId: string): Promise<Exercise[]> {
    const rows = await this.database
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.ownerAccountId, ownerAccountId))
      .orderBy(asc(sql`lower(${exercisesTable.name})`), asc(exercisesTable.id));

    return rows.map((row) => this.exerciseOf(row));
  }

  async find({
    ownerAccountId,
    exerciseId,
  }: ExerciseReference): Promise<Exercise | null> {
    const [row] = await this.database
      .select()
      .from(exercisesTable)
      .where(
        and(
          eq(exercisesTable.id, exerciseId),
          eq(exercisesTable.ownerAccountId, ownerAccountId),
        ),
      )
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
    const {
      id,
      ownerAccountId,
      createdAt: _createdAt,
      ...columns
    } = this.rowOf(exercise);

    try {
      await this.database
        .update(exercisesTable)
        .set(columns)
        .where(
          and(
            eq(exercisesTable.id, id),
            eq(exercisesTable.ownerAccountId, ownerAccountId),
          ),
        );

      return "replaced";
    } catch (error) {
      return this.nameTakenOrRethrow(error);
    }
  }

  async remove({
    ownerAccountId,
    exerciseId,
  }: ExerciseReference): Promise<ExerciseRemoval> {
    const removed = await this.database
      .delete(exercisesTable)
      .where(
        and(
          eq(exercisesTable.id, exerciseId),
          eq(exercisesTable.ownerAccountId, ownerAccountId),
        ),
      )
      .returning({ id: exercisesTable.id });

    return removed.length > 0 ? "removed" : "missing";
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
    const { cues, video, ...snapshot } = exercise.toSnapshot();

    return {
      ...snapshot,
      formCues: cues,
      videoId: video?.videoId ?? null,
      videoFormat: video?.format ?? null,
      videoSizeBytes: video?.sizeBytes ?? null,
    };
  }

  private exerciseOf({
    formCues,
    videoId,
    videoFormat,
    videoSizeBytes,
    ...row
  }: ExerciseRow): Exercise {
    return Exercise.reconstitute({
      ...row,
      cues: formCues,
      video: this.videoOf({ videoId, videoFormat, videoSizeBytes }),
    });
  }

  private videoOf(
    columns: Pick<ExerciseRow, "videoId" | "videoFormat" | "videoSizeBytes">,
  ): ExerciseVideoSnapshot | null {
    const { videoId, videoFormat, videoSizeBytes } = columns;

    if (videoId === null || videoFormat === null || videoSizeBytes === null) {
      return null;
    }

    return {
      videoId: videoId,
      format: videoFormat,
      sizeBytes: videoSizeBytes,
    };
  }
}
