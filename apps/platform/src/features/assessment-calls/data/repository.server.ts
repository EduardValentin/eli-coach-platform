import { randomUUID } from "node:crypto";

import {
  ASSESSMENT_CALL_RULES,
  AssessmentCall,
  type AssessmentCallReservations,
  type ReservationResult,
  type ReserveAssessmentCallCommand,
} from "@eli-coach-platform/domain/assessment-call";
import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  releaseCoachTime,
  reserveCoachTime,
} from "@eli-coach-platform/infrastructure/coach-calendar/server";
import { and, eq, gt, sql } from "drizzle-orm";

import { assessmentCallsTable } from "./schema.server";

type AssessmentCallRow = typeof assessmentCallsTable.$inferSelect;

const UNREADABLE_IDENTIFIER_CODE = "22P02";

export class PostgresAssessmentCallRepository implements AssessmentCallReservations {
  constructor(private readonly database: DatabaseClient) {}

  reserve(command: ReserveAssessmentCallCommand): Promise<ReservationResult> {
    return this.database.transaction((transaction) =>
      reserveUnderEmailLock(transaction, command),
    );
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

  async listAll(): Promise<AssessmentCall[]> {
    const rows = await this.database
      .select()
      .from(assessmentCallsTable)
      .orderBy(assessmentCallsTable.startsAt);

    return rows.map(toAssessmentCall);
  }
}

async function reserveUnderEmailLock(
  transaction: DatabaseTransaction,
  command: ReserveAssessmentCallCommand,
): Promise<ReservationResult> {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtext(${command.normalizedEmail}))`,
  );

  const appointment = {
    appointmentKind: "assessment_call",
    appointmentId: randomUUID(),
  } as const;
  const coachTime = await reserveCoachTime(transaction, {
    ...ASSESSMENT_CALL_RULES.coachTimeFrom(command.startsAt),
    ...appointment,
  });
  const decision = AssessmentCall.decideReservation({
    coachTime: coachTime.status,
    upcomingCallForEmail: await findUpcomingCallForEmail(transaction, command),
  });

  if (decision.status === "reserved") {
    return {
      status: "reserved",
      call: await insertCall(transaction, {
        id: appointment.appointmentId,
        command,
      }),
    };
  }

  if (coachTime.status === "reserved") {
    await releaseCoachTime(transaction, appointment);
  }

  return decision;
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
  newCall: { id: string; command: ReserveAssessmentCallCommand },
): Promise<AssessmentCall> {
  const { id, command } = newCall;
  const [row] = await transaction
    .insert(assessmentCallsTable)
    .values({
      id,
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

function isUnreadableIdentifier(error: unknown): boolean {
  return isCausedByDatabaseError(
    error,
    ({ code }) => code === UNREADABLE_IDENTIFIER_CODE,
  );
}
