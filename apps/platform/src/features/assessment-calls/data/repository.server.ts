import {
  ASSESSMENT_CALL_RULES,
  AssessmentCall,
  type AssessmentCallReservations,
  type ReservationResult,
  type ReserveAssessmentCallCommand,
} from "@eli-coach-platform/domain/assessment-call";
import type { TimeInterval } from "@eli-coach-platform/domain/coach-availability";
import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
import { and, eq, gt, sql } from "drizzle-orm";

import { assessmentCallsTable } from "./schema.server";

type AssessmentCallRow = typeof assessmentCallsTable.$inferSelect;

type AssessmentCallAppointment = {
  appointmentKind: "assessment_call";
  appointmentId: string;
};

export type AssessmentCallCoachTime = {
  reserve: (
    transaction: DatabaseTransaction,
    reservation: AssessmentCallAppointment & TimeInterval,
  ) => Promise<{ status: "reserved" | "taken" }>;
};

type PostgresAssessmentCallRepositoryOptions = {
  database: DatabaseClient;
  coachTime: AssessmentCallCoachTime;
};

const UNREADABLE_IDENTIFIER_CODE = "22P02";

export class PostgresAssessmentCallRepository implements AssessmentCallReservations {
  constructor(
    private readonly options: PostgresAssessmentCallRepositoryOptions,
  ) {}

  reserve(command: ReserveAssessmentCallCommand): Promise<ReservationResult> {
    return this.options.database.transaction((transaction) =>
      this.reserveUnderEmailLock(transaction, command),
    );
  }

  async findById(id: string): Promise<AssessmentCall | null> {
    try {
      const [row] = await this.options.database
        .select()
        .from(assessmentCallsTable)
        .where(eq(assessmentCallsTable.id, id))
        .limit(1);

      return row ? this.toAssessmentCall(row) : null;
    } catch (error) {
      if (this.isUnreadableIdentifier(error)) {
        return null;
      }

      throw error;
    }
  }

  async listAll(): Promise<AssessmentCall[]> {
    const rows = await this.options.database
      .select()
      .from(assessmentCallsTable)
      .orderBy(assessmentCallsTable.startsAt);

    return rows.map((row) => this.toAssessmentCall(row));
  }

  private async reserveUnderEmailLock(
    transaction: DatabaseTransaction,
    command: ReserveAssessmentCallCommand,
  ): Promise<ReservationResult> {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${command.normalizedEmail}))`,
    );

    const upcomingCallForEmail = await this.findUpcomingCallForEmail(
      transaction,
      command,
    );

    await transaction.execute(sql`savepoint assessment_call_reservation`);

    const call = await this.insertCall(transaction, command);
    const coachTime = await this.options.coachTime.reserve(transaction, {
      ...ASSESSMENT_CALL_RULES.coachTimeFrom(command.startsAt),
      appointmentKind: "assessment_call",
      appointmentId: call.id,
    });
    const decision = AssessmentCall.decideReservation({
      coachTime: coachTime.status,
      upcomingCallForEmail,
    });

    if (decision.status === "reserved") {
      return { status: "reserved", call };
    }

    await transaction.execute(
      sql`rollback to savepoint assessment_call_reservation`,
    );

    return decision;
  }

  private async findUpcomingCallForEmail(
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

    return row ? this.toAssessmentCall(row) : null;
  }

  private async insertCall(
    transaction: DatabaseTransaction,
    command: ReserveAssessmentCallCommand,
  ): Promise<AssessmentCall> {
    const [row] = await transaction
      .insert(assessmentCallsTable)
      .values({
        firstName: command.firstName,
        lastName: command.lastName,
        visitorEmail: command.normalizedEmail,
        visitorNotes: command.notes,
        dateOfBirth: command.dateOfBirth,
        gender: command.gender,
        primaryGoal: command.primaryGoal,
        country: command.country,
        phone: command.phone,
        startsAt: command.startsAt,
        visitorTimeZone: command.visitorTimeZone,
        coachTimeZone: command.coachTimeZone,
        bookedAt: command.bookedAt,
      })
      .returning();

    if (!row) {
      throw new Error("Assessment call reservation returned no row.");
    }

    return this.toAssessmentCall(row);
  }

  private toAssessmentCall(row: AssessmentCallRow): AssessmentCall {
    return AssessmentCall.reconstitute({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      visitorEmail: row.visitorEmail,
      visitorNotes: row.visitorNotes,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      primaryGoal: row.primaryGoal,
      country: row.country,
      phone: row.phone,
      startsAt: row.startsAt,
      visitorTimeZone: row.visitorTimeZone,
      coachTimeZone: row.coachTimeZone,
      bookedAt: row.bookedAt,
    });
  }

  private isUnreadableIdentifier(error: unknown): boolean {
    return isCausedByDatabaseError(
      error,
      ({ code }) => code === UNREADABLE_IDENTIFIER_CODE,
    );
  }
}
