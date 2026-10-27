import {
  ASSESSMENT_CALL_RULES,
  AssessmentCall,
  type AssessmentCallReservations,
  type ReservationDecision,
  type ReserveAssessmentCallCommand,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { TimeInterval } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "~/shared/database";
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
const RESERVATION_SAVEPOINT = sql.identifier("assessment_call_reservation");

export class PostgresAssessmentCallRepository implements AssessmentCallReservations {
  constructor(
    private readonly options: PostgresAssessmentCallRepositoryOptions,
  ) {}

  reserve(command: ReserveAssessmentCallCommand): Promise<ReservationDecision> {
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
  ): Promise<ReservationDecision> {
    const { call } = command;

    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${call.visitorEmail}))`,
    );

    const upcomingCallForEmail = await this.findUpcomingCallForEmail(
      transaction,
      command,
    );

    await transaction.execute(sql`savepoint ${RESERVATION_SAVEPOINT}`);

    await this.insertCall(transaction, call);
    const coachTime = await this.options.coachTime.reserve(transaction, {
      ...ASSESSMENT_CALL_RULES.coachTimeFrom(call.startsAt),
      appointmentKind: "assessment_call",
      appointmentId: call.id,
    });
    const decision = AssessmentCall.decideReservation({
      coachTime: coachTime.status,
      upcomingCallForEmail,
    });

    if (decision.status !== "reserved") {
      await transaction.execute(
        sql`rollback to savepoint ${RESERVATION_SAVEPOINT}`,
      );
    }

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
          eq(assessmentCallsTable.visitorEmail, command.call.visitorEmail),
          gt(assessmentCallsTable.startsAt, command.now),
        ),
      )
      .orderBy(assessmentCallsTable.startsAt)
      .limit(1);

    return row ? this.toAssessmentCall(row) : null;
  }

  private async insertCall(
    transaction: DatabaseTransaction,
    call: AssessmentCall,
  ): Promise<void> {
    await transaction.insert(assessmentCallsTable).values({
      id: call.id,
      firstName: call.firstName,
      lastName: call.lastName,
      visitorEmail: call.visitorEmail,
      visitorNotes: call.visitorNotes,
      dateOfBirth: call.dateOfBirth,
      gender: call.gender,
      primaryGoal: call.primaryGoal,
      country: call.country,
      phone: call.phone,
      startsAt: call.startsAt,
      visitorTimeZone: call.visitorTimeZone,
      coachTimeZone: call.coachTimeZone,
      bookedAt: call.bookedAt,
    });
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
