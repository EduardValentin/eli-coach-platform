import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  Equipment,
  Exercise,
  ExerciseDifficulty,
  ExerciseRepository,
  ExerciseTag,
  ExerciseVideo,
  MuscleGroup,
  PersistExerciseCommand,
} from "@eli-coach-platform/domain";
import { eq, sql } from "drizzle-orm";

import { exercisesTable } from "./schema.server";

const exerciseColumns = {
  id: exercisesTable.id,
  name: exercisesTable.name,
  description: exercisesTable.description,
  difficulty: exercisesTable.difficulty,
  equipment: exercisesTable.equipment,
  primaryMuscles: exercisesTable.primaryMuscles,
  secondaryMuscles: exercisesTable.secondaryMuscles,
  tags: exercisesTable.tags,
  videoAssetKey: exercisesTable.videoAssetKey,
  videoMimeType: exercisesTable.videoMimeType,
  videoSizeBytes: exercisesTable.videoSizeBytes,
  videoSha256: exercisesTable.videoSha256,
  createdAt: exercisesTable.createdAt,
  updatedAt: exercisesTable.updatedAt,
};

type ExerciseRow = {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  tags: string[];
  videoAssetKey: string | null;
  videoMimeType: string | null;
  videoSizeBytes: number | null;
  videoSha256: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PostgresExerciseRepository implements ExerciseRepository {
  constructor(private readonly database: DatabaseClient) {}

  async listExercises(): Promise<readonly Exercise[]> {
    const rows = await this.database
      .select(exerciseColumns)
      .from(exercisesTable)
      .orderBy(sql`lower(${exercisesTable.name})`, exercisesTable.id);

    return rows.map(mapExerciseRow);
  }

  async findExerciseById(id: string): Promise<Exercise | null> {
    const [row] = await this.database
      .select(exerciseColumns)
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id));

    return row ? mapExerciseRow(row) : null;
  }

  async findVideoByAssetKey(assetKey: string): Promise<ExerciseVideo | null> {
    const [row] = await this.database
      .select({
        assetKey: exercisesTable.videoAssetKey,
        mimeType: exercisesTable.videoMimeType,
        sizeBytes: exercisesTable.videoSizeBytes,
        sha256: exercisesTable.videoSha256,
      })
      .from(exercisesTable)
      .where(eq(exercisesTable.videoAssetKey, assetKey))
      .limit(1);

    return row ? mapVideo(row) : null;
  }

  async insertExercise(command: PersistExerciseCommand): Promise<Exercise> {
    const [row] = await this.database
      .insert(exercisesTable)
      .values(toRow(command))
      .returning(exerciseColumns);

    if (!row) {
      throw new Error("Exercise insert returned no row.");
    }

    return mapExerciseRow(row);
  }

  async updateExercise(
    id: string,
    command: PersistExerciseCommand,
  ): Promise<Exercise | null> {
    const [row] = await this.database
      .update(exercisesTable)
      .set({ ...toRow(command), updatedAt: sql`now()` })
      .where(eq(exercisesTable.id, id))
      .returning(exerciseColumns);

    return row ? mapExerciseRow(row) : null;
  }
}

function toRow(command: PersistExerciseCommand) {
  return {
    name: command.name,
    description: command.description,
    difficulty: command.difficulty,
    equipment: [...command.equipment],
    primaryMuscles: [...command.primaryMuscles],
    secondaryMuscles: [...command.secondaryMuscles],
    tags: [...command.tags],
    videoAssetKey: command.video?.assetKey ?? null,
    videoMimeType: command.video?.mimeType ?? null,
    videoSizeBytes: command.video?.sizeBytes ?? null,
    videoSha256: command.video?.sha256 ?? null,
  };
}

// The check constraints guarantee membership, so the casts restate what the
// database already enforces.
function mapExerciseRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    difficulty: row.difficulty as ExerciseDifficulty,
    equipment: row.equipment as Equipment[],
    primaryMuscles: row.primaryMuscles as MuscleGroup[],
    secondaryMuscles: row.secondaryMuscles as MuscleGroup[],
    tags: row.tags as ExerciseTag[],
    video: mapVideo({
      assetKey: row.videoAssetKey,
      mimeType: row.videoMimeType,
      sizeBytes: row.videoSizeBytes,
      sha256: row.videoSha256,
    }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// The presence constraint keeps the four columns all set or all null.
function mapVideo(columns: {
  assetKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
}): ExerciseVideo | null {
  return columns.assetKey && columns.mimeType && columns.sizeBytes !== null && columns.sha256
    ? {
        assetKey: columns.assetKey,
        mimeType: columns.mimeType,
        sizeBytes: columns.sizeBytes,
        sha256: columns.sha256,
      }
    : null;
}
