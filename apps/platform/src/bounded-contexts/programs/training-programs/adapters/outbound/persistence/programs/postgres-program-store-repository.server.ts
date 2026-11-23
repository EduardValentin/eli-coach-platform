import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { executorOf, inSavepoint } from "~/shared/database/index.server";
import {
  Program,
  type DraftSaveOutcome,
  type ProgramAddition,
  type DraftWrite,
  type ProgramStorePort,
  type ProgramVersionSnapshot,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import { and, asc, eq } from "drizzle-orm";

import { programContentSchema } from "~/bounded-contexts/programs/training-programs/public/program-content-schema";
import {
  programsConstraints,
  programsTable,
  programVersionsTable,
} from "~/bounded-contexts/programs/training-programs/adapters/outbound/persistence/schema.server";

const UNIQUE_VIOLATION_CODE = "23505";

type ProgramVersionRow = typeof programVersionsTable.$inferSelect;

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

  async saveDraft({
    program,
    expectedUpdatedAt,
  }: DraftWrite): Promise<DraftSaveOutcome> {
    const draft = program.draft();

    if (!draft) {
      throw new Error("A program without a draft has no draft to save.");
    }

    const { id, level, language, updatedAt } = program.toSnapshot();
    const savedVersions = await this.executor
      .update(programVersionsTable)
      .set({ content: draft.content, updatedAt: draft.updatedAt })
      .where(
        and(
          eq(programVersionsTable.programId, id),
          eq(programVersionsTable.number, draft.versionNumber),
          eq(programVersionsTable.status, "draft"),
          eq(programVersionsTable.updatedAt, expectedUpdatedAt),
        ),
      )
      .returning({ number: programVersionsTable.number });

    if (savedVersions.length === 0) {
      return "changed-elsewhere";
    }

    await this.executor
      .update(programsTable)
      .set({ level, language, updatedAt })
      .where(eq(programsTable.id, id));

    return "saved";
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
