import { appSchema } from "@eli-coach-platform/db";
import {
  DIFFICULTIES,
  EXERCISE_TYPES,
  EXERCISE_VIDEO_FORMATS,
  EXERCISE_UNITS,
  MAX_EXERCISE_NAME_LENGTH,
  type Difficulty,
  type Equipment,
  type ExerciseTag,
  type ExerciseType,
  type ExerciseUnit,
  type ExerciseVideoFormat,
  type Muscle,
} from "@eli-coach-platform/domain/exercise";
import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const exercisesConstraints = {
  nameUnique: "exercises_name_unique",
} as const;

export const exercisesTable = appSchema.table(
  "exercises",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: MAX_EXERCISE_NAME_LENGTH }).notNull(),
    formCues: text("form_cues").notNull(),
    type: varchar("type", { length: 16 }).$type<ExerciseType>().notNull(),
    unit: varchar("unit", { length: 16 }).$type<ExerciseUnit>().notNull(),
    perSide: boolean("per_side").notNull(),
    difficulty: varchar("difficulty", { length: 16 })
      .$type<Difficulty>()
      .notNull(),
    primaryMuscles: text("primary_muscles").array().$type<Muscle[]>().notNull(),
    secondaryMuscles: text("secondary_muscles")
      .array()
      .$type<Muscle[]>()
      .notNull(),
    equipment: text("equipment").array().$type<Equipment[]>().notNull(),
    tags: text("tags").array().$type<ExerciseTag[]>().notNull(),
    videoId: uuid("video_file_id"),
    videoFormat: varchar("video_format", {
      length: 8,
    }).$type<ExerciseVideoFormat>(),
    videoSizeBytes: integer("video_size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex(exercisesConstraints.nameUnique).on(
      sql`lower(btrim(${table.name}))`,
    ),
    check(
      "exercises_type_check",
      sql`${table.type} in (${quotedList(EXERCISE_TYPES)})`,
    ),
    check(
      "exercises_unit_check",
      sql`${table.unit} in (${quotedList(EXERCISE_UNITS)})`,
    ),
    check(
      "exercises_difficulty_check",
      sql`${table.difficulty} in (${quotedList(DIFFICULTIES)})`,
    ),
    check(
      "exercises_video_complete_check",
      sql`(${table.videoId} is null) = (${table.videoFormat} is null) and (${table.videoId} is null) = (${table.videoSizeBytes} is null)`,
    ),
    check(
      "exercises_video_format_check",
      sql`${table.videoFormat} in (${quotedList(EXERCISE_VIDEO_FORMATS)})`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
