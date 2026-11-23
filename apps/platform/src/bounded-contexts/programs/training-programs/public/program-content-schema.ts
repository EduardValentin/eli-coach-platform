import {
  BLOCK_TYPES,
  DAILY_STEP_TARGETS,
  SESSION_MINUTE_OPTIONS,
  SPLIT_SHAPES,
  TRAINING_DAY_OPTIONS,
  WEEKDAYS,
  type ProgramContent,
  type Weekday,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import { z } from "zod";

const rangeSchema = z.strictObject({ min: z.number(), max: z.number() });

const sessionSchema = z.strictObject({
  id: z.string(),
  originId: z.string(),
  name: z.string(),
  warmUp: z.strictObject({
    items: z.array(
      z.strictObject({
        id: z.string(),
        exerciseId: z.string(),
        sets: z.number(),
        reps: rangeSchema.optional(),
        seconds: z.number().optional(),
      }),
    ),
  }),
  coolDown: z.strictObject({
    enabled: z.boolean(),
    items: z.array(
      z.strictObject({
        id: z.string(),
        exerciseId: z.string(),
        seconds: z.number(),
      }),
    ),
  }),
  rows: z.array(z.strictObject({ id: z.string(), exerciseId: z.string() })),
});

const cardioSessionSchema = z.strictObject({
  id: z.string(),
  originId: z.string(),
  name: z.string(),
  segments: z.array(
    z.strictObject({
      id: z.string(),
      kind: z.literal("steady"),
      exerciseId: z.string(),
      minutes: z.number(),
      intensity: z.enum(["easy", "moderate", "hard"]),
    }),
  ),
});

const calendarEntrySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("session"), sessionId: z.string() }),
  z.strictObject({ kind: z.literal("cardio"), cardioId: z.string() }),
  z.strictObject({ kind: z.literal("rest") }),
]);

const blockSchema = z.strictObject({
  id: z.string(),
  originId: z.string(),
  type: z.enum(BLOCK_TYPES),
  weeks: z.int().min(1),
  trainingDays: z.literal(TRAINING_DAY_OPTIONS),
  calibrationWeek: z.boolean(),
  introText: z.string(),
  clientNote: z.string(),
  split: z.strictObject({
    shape: z.enum(SPLIT_SHAPES),
    name: z.string(),
    text: z.string(),
  }),
  targetMinutes: z.literal(SESSION_MINUTE_OPTIONS),
  calendar: z.strictObject(
    Object.fromEntries(
      WEEKDAYS.map((day) => [day, calendarEntrySchema]),
    ) as Record<Weekday, typeof calendarEntrySchema>,
  ),
  sessions: z.array(sessionSchema),
  cardioSessions: z.array(cardioSessionSchema),
  dailySteps: z.number().refine((steps) => DAILY_STEP_TARGETS.includes(steps)),
  missedDayNote: z.string(),
});

export const programContentSchema = z.strictObject({
  header: z.strictObject({
    title: z.string(),
    focus: z.string(),
    personalNote: z.string(),
  }),
  plan: z.strictObject({ blocks: z.array(blockSchema) }),
  nutritionNotes: z.string(),
  lifestyleNotes: z.string(),
}) satisfies z.ZodType<ProgramContent>;
