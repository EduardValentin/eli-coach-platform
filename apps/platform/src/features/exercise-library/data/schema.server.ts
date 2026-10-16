import { appSchema } from "@eli-coach-platform/db";
import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  EXERCISE_VIDEO_FORMATS,
  EXERCISE_UNITS,
  MAX_EXERCISE_NAME_LENGTH,
  MAX_EXERCISE_VIDEO_BYTES,
  MAX_FORM_CUES_LENGTH,
  MUSCLES,
  unitsFor,
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

import { accountsTable } from "~/features/accounts/data/schema.server";

export const exercisesConstraints = {
  nameUnique: "exercises_owner_name_unique",
} as const;

export const exercisesTable = appSchema.table(
  "exercises",
  {
    id: uuid("id").primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => accountsTable.id),
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
      table.ownerAccountId,
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
      "exercises_unit_for_type_check",
      sql`(${table.type}, ${table.unit}) in (${typeUnitPairs()})`,
    ),
    check(
      "exercises_name_check",
      sql`${table.name} = btrim(${table.name}) and char_length(${table.name}) between 1 and ${sql.raw(String(MAX_EXERCISE_NAME_LENGTH))}`,
    ),
    check(
      "exercises_form_cues_check",
      sql`char_length(${table.formCues}) <= ${sql.raw(String(MAX_FORM_CUES_LENGTH))}`,
    ),
    check(
      "exercises_primary_muscle_check",
      sql`${table.type} = 'cardio' or cardinality(${table.primaryMuscles}) > 0`,
    ),
    check(
      "exercises_primary_muscles_vocabulary_check",
      sql`${table.primaryMuscles} <@ ${textArray(MUSCLES)}`,
    ),
    check(
      "exercises_secondary_muscles_vocabulary_check",
      sql`${table.secondaryMuscles} <@ ${textArray(MUSCLES)}`,
    ),
    check(
      "exercises_muscles_overlap_check",
      sql`not (${table.primaryMuscles} && ${table.secondaryMuscles})`,
    ),
    check(
      "exercises_equipment_vocabulary_check",
      sql`${table.equipment} <@ ${textArray(EQUIPMENT)}`,
    ),
    check(
      "exercises_tags_vocabulary_check",
      sql`${table.tags} <@ ${textArray(EXERCISE_TAGS)}`,
    ),
    check(
      "exercises_video_format_check",
      sql`${table.videoFormat} in (${quotedList(EXERCISE_VIDEO_FORMATS)})`,
    ),
    check(
      "exercises_video_size_check",
      sql`${table.videoSizeBytes} between 1 and ${sql.raw(String(MAX_EXERCISE_VIDEO_BYTES))}`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}

function textArray(values: readonly string[]): SQL {
  return sql`array[${quotedList(values)}]::text[]`;
}

function typeUnitPairs(): SQL {
  return sql.raw(
    EXERCISE_TYPES.flatMap((type) =>
      unitsFor(type).map((unit) => `('${type}', '${unit}')`),
    ).join(", "),
  );
}
