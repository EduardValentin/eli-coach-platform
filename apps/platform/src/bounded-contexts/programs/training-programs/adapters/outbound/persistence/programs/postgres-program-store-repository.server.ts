import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { executorOf, inSavepoint } from "~/shared/database/index.server";
import {
  BLOCK_TYPES,
  Program,
  SPLIT_SHAPES,
  TRAINING_DAY_OPTIONS,
  WEEKDAYS,
  type ProgramAddition,
  type ProgramContent,
  type ProgramStorePort,
  type ProgramVersionSnapshot,
  type Weekday,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  programsConstraints,
  programsTable,
  programVersionsTable,
} from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

type ProgramVersionRow = typeof programVersionsTable.$inferSelect;

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
  weeks: z.number(),
  trainingDays: z.literal(TRAINING_DAY_OPTIONS),
  calibrationWeek: z.boolean(),
  introText: z.string(),
  clientNote: z.string(),
  split: z.strictObject({
    shape: z.enum(SPLIT_SHAPES),
    name: z.string(),
    text: z.string(),
  }),
  targetMinutes: z.number(),
  calendar: z.strictObject(
    Object.fromEntries(
      WEEKDAYS.map((day) => [day, calendarEntrySchema]),
    ) as Record<Weekday, typeof calendarEntrySchema>,
  ),
  sessions: z.array(sessionSchema),
  cardioSessions: z.array(cardioSessionSchema),
  dailySteps: z.number(),
  missedDayNote: z.string(),
});

const programContentSchema = z.strictObject({
  header: z.strictObject({
    title: z.string(),
    focus: z.string(),
    personalNote: z.string(),
  }),
  plan: z.strictObject({ blocks: z.array(blockSchema) }),
  nutritionNotes: z.string(),
  lifestyleNotes: z.string(),
}) satisfies z.ZodType<ProgramContent>;

export class PostgresProgramStoreRepository implements ProgramStorePort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async findByClientId(clientId: string): Promise<Program | null> {
    const [program] = await this.executor
      .select()
      .from(programsTable)
      .where(eq(programsTable.clientId, clientId))
      .limit(1);

    if (!program) {
      return null;
    }

    const versions = await this.executor
      .select()
      .from(programVersionsTable)
      .where(eq(programVersionsTable.programId, program.id))
      .orderBy(asc(programVersionsTable.number));

    return Program.reconstitute({
      ...program,
      versions: versions.map((version) => this.versionOf(version)),
    });
  }

  async add(program: Program): Promise<ProgramAddition> {
    const { versions, ...row } = program.toSnapshot();

    try {
      await inSavepoint(this.executor, async (savepoint) => {
        await savepoint.insert(programsTable).values(row);

        if (versions.length > 0) {
          await savepoint
            .insert(programVersionsTable)
            .values(
              versions.map((version) => ({ programId: row.id, ...version })),
            );
        }
      });

      return "added";
    } catch (error) {
      return this.clientHasProgramOrRethrow(error);
    }
  }

  private versionOf({
    programId: _programId,
    content,
    ...version
  }: ProgramVersionRow): ProgramVersionSnapshot {
    return { ...version, content: programContentSchema.parse(content) };
  }

  private clientHasProgramOrRethrow(error: unknown): "client-has-program" {
    const clientHasProgram = isCausedByDatabaseError(
      error,
      ({ code, constraint }) =>
        code === UNIQUE_VIOLATION_CODE &&
        constraint === programsConstraints.programPerClient,
    );

    if (!clientHasProgram) {
      throw error;
    }

    return "client-has-program";
  }
}
