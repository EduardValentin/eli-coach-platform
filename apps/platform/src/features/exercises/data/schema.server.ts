import { sql } from "drizzle-orm";
import {
  check,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { appSchema } from "@eli-coach-platform/db";
import {
  EQUIPMENT_OPTIONS,
  EXERCISE_DIFFICULTIES,
  EXERCISE_TAGS,
  MUSCLE_GROUPS,
} from "@eli-coach-platform/domain";

// Check constraints are DDL, so the vocabularies are inlined as literals; the
// values are code constants that never carry a quote.
const textArrayLiteral = (values: readonly string[]) =>
  sql.raw(`array[${values.map((value) => `'${value}'`).join(", ")}]::text[]`);
const textListLiteral = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value}'`).join(", "));
const RELATIVE_KEY_PATTERN = sql.raw("'(^/|(^|/)\\.\\.(/|$))'");

export const exercisesTable = appSchema.table(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    difficulty: varchar("difficulty", { length: 16 }).notNull(),
    equipment: text("equipment").array().notNull().default(sql`'{}'::text[]`),
    primaryMuscles: text("primary_muscles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    secondaryMuscles: text("secondary_muscles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    videoAssetKey: varchar("video_asset_key", { length: 512 }),
    videoMimeType: varchar("video_mime_type", { length: 255 }),
    videoSizeBytes: integer("video_size_bytes"),
    videoSha256: varchar("video_sha256", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("exercises_name_check", sql`length(btrim(${table.name})) > 0`),
    check(
      "exercises_difficulty_check",
      sql`${table.difficulty} in (${textListLiteral(EXERCISE_DIFFICULTIES)})`,
    ),
    check(
      "exercises_equipment_check",
      sql`${table.equipment} <@ ${textArrayLiteral(EQUIPMENT_OPTIONS)}`,
    ),
    check(
      "exercises_primary_muscles_check",
      sql`${table.primaryMuscles} <@ ${textArrayLiteral(MUSCLE_GROUPS)}`,
    ),
    check(
      "exercises_secondary_muscles_check",
      sql`${table.secondaryMuscles} <@ ${textArrayLiteral(MUSCLE_GROUPS)}`,
    ),
    check(
      "exercises_muscles_disjoint_check",
      sql`not (${table.primaryMuscles} && ${table.secondaryMuscles})`,
    ),
    check(
      "exercises_tags_check",
      sql`${table.tags} <@ ${textArrayLiteral(EXERCISE_TAGS)}`,
    ),
    check(
      "exercises_video_presence_check",
      sql`(${table.videoAssetKey} is null and ${table.videoMimeType} is null and ${table.videoSizeBytes} is null and ${table.videoSha256} is null) or (${table.videoAssetKey} is not null and ${table.videoMimeType} is not null and ${table.videoSizeBytes} is not null and ${table.videoSha256} is not null)`,
    ),
    check(
      "exercises_video_relative_key_check",
      sql`${table.videoAssetKey} is null or (length(btrim(${table.videoAssetKey})) > 0 and ${table.videoAssetKey} !~ ${RELATIVE_KEY_PATTERN} and position(chr(92) in ${table.videoAssetKey}) = 0 and ${table.videoAssetKey} !~ '^[A-Za-z]:')`,
    ),
    check(
      "exercises_video_size_check",
      sql`${table.videoSizeBytes} is null or ${table.videoSizeBytes} >= 0`,
    ),
    check(
      "exercises_video_sha256_check",
      sql`${table.videoSha256} is null or ${table.videoSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);
