import {
  AssessmentCall,
  type AssessmentCallReservations,
  type ReservationResult,
  type ReserveAssessmentCallCommand,
} from "@eli-coach-platform/domain/assessment-call";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { and, eq, gt, gte, sql } from "drizzle-orm";

import { assessmentCallsTable } from "./schema.server";

type AssessmentCallRow = typeof assessmentCallsTable.$inferSelect;
type DatabaseTransaction = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];

const UNIQUE_VIOLATION_CODE = "23505";
const UNREADABLE_IDENTIFIER_CODE = "22P02";
const START_UNIQUE_CONSTRAINT = "assessment_calls_starts_at_unique";

export class PostgresAssessmentCallRepository implements AssessmentCallReservations {
  constructor(private readonly database: DatabaseClient) {}

  async reserve(
    command: ReserveAssessmentCallCommand,
  ): Promise<ReservationResult> {
    try {
      return await this.database.transaction((transaction) =>
        reserveUnderEmailLock(transaction, command),
      );
    } catch (error) {
      if (!isStartUniqueViolation(error)) {
        throw error;
      }

      return this.readSlotHolder(command.startsAt, error);
    }
  }

  async reservedStartsFrom(from: Date): Promise<Date[]> {
    const rows = await this.database
      .select({ startsAt: assessmentCallsTable.startsAt })
      .from(assessmentCallsTable)
      .where(gte(assessmentCallsTable.startsAt, from))
      .orderBy(assessmentCallsTable.startsAt);

    return rows.map((row) => row.startsAt);
  }

  async findById(id: string): Promise<AssessmentCall | null> {
    try {
      const [row] = await this.database
        .select()
        .from(assessmentCallsTable)
        .where(eq(assessmentCallsTable.id, id))
        .limit(1);

      return row ? toAssessmentCall(row) : null;
    } catch (error) {
      if (isUnreadableIdentifier(error)) {
        return null;
      }

      throw error;
    }
  }

  private async readSlotHolder(
    startsAt: Date,
    violation: unknown,
  ): Promise<ReservationResult> {
    const [row] = await this.database
      .select()
      .from(assessmentCallsTable)
      .where(eq(assessmentCallsTable.startsAt, startsAt))
      .limit(1);

    if (!row) {
      throw violation;
    }

    return { status: "slot_taken", existing: toAssessmentCall(row) };
  }
}

async function reserveUnderEmailLock(
  transaction: DatabaseTransaction,
  command: ReserveAssessmentCallCommand,
): Promise<ReservationResult> {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtext(${command.normalizedEmail}))`,
  );

  const decision = AssessmentCall.decideReservation({
    slotHolder: await findSlotHolder(transaction, command.startsAt),
    upcomingCallForEmail: await findUpcomingCallForEmail(transaction, command),
  });

  switch (decision.decision) {
    case "slot_taken": {
      return { status: "slot_taken", existing: decision.existing };
    }

    case "email_has_upcoming_call": {
      return { status: "email_has_upcoming_call", existing: decision.existing };
    }

    case "reserve": {
      return {
        status: "reserved",
        call: await insertCall(transaction, command),
      };
    }
  }
}

async function findSlotHolder(
  transaction: DatabaseTransaction,
  startsAt: Date,
): Promise<AssessmentCall | null> {
  const [row] = await transaction
    .select()
    .from(assessmentCallsTable)
    .where(eq(assessmentCallsTable.startsAt, startsAt))
    .limit(1);

  return row ? toAssessmentCall(row) : null;
}

async function findUpcomingCallForEmail(
  transaction: DatabaseTransaction,
  command: ReserveAssessmentCallCommand,
): Promise<AssessmentCall | null> {
  const [row] = await transaction
    .select()
    .from(assessmentCallsTable)
    .where(
      and(
        eq(assessmentCallsTable.visitorEmail, command.normalizedEmail),
        gt(assessmentCallsTable.startsAt, command.now),
      ),
    )
    .orderBy(assessmentCallsTable.startsAt)
    .limit(1);

  return row ? toAssessmentCall(row) : null;
}

async function insertCall(
  transaction: DatabaseTransaction,
  command: ReserveAssessmentCallCommand,
): Promise<AssessmentCall> {
  const [row] = await transaction
    .insert(assessmentCallsTable)
    .values({
      visitorName: command.fullName,
      visitorEmail: command.normalizedEmail,
      visitorNotes: command.notes,
      startsAt: command.startsAt,
      visitorTimeZone: command.visitorTimeZone,
      coachTimeZone: command.coachTimeZone,
      bookedAt: command.bookedAt,
    })
    .returning();

  if (!row) {
    throw new Error("Assessment call reservation returned no row.");
  }

  return toAssessmentCall(row);
}

function toAssessmentCall(row: AssessmentCallRow): AssessmentCall {
  return AssessmentCall.reconstitute({
    id: row.id,
    visitorName: row.visitorName,
    visitorEmail: row.visitorEmail,
    visitorNotes: row.visitorNotes,
    startsAt: row.startsAt,
    visitorTimeZone: row.visitorTimeZone,
    coachTimeZone: row.coachTimeZone,
    bookedAt: row.bookedAt,
  });
}

function isStartUniqueViolation(error: unknown): boolean {
  return matchesCause(
    error,
    (cause) =>
      readTextField(cause, "code") === UNIQUE_VIOLATION_CODE &&
      readTextField(cause, "constraint") === START_UNIQUE_CONSTRAINT,
  );
}

function isUnreadableIdentifier(error: unknown): boolean {
  return matchesCause(
    error,
    (cause) => readTextField(cause, "code") === UNREADABLE_IDENTIFIER_CODE,
  );
}

function matchesCause(
  error: unknown,
  matches: (cause: object) => boolean,
): boolean {
  let currentError = error;

  while (typeof currentError === "object" && currentError !== null) {
    if (matches(currentError)) {
      return true;
    }

    currentError =
      "cause" in currentError
        ? (currentError as { cause?: unknown }).cause
        : null;
  }

  return false;
}

function readTextField(
  error: object,
  field: "code" | "constraint",
): string | null {
  if (!(field in error)) {
    return null;
  }

  const value = (error as Record<typeof field, unknown>)[field];

  return typeof value === "string" ? value : null;
}
