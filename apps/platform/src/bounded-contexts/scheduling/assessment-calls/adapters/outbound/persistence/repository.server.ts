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
} from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { and, eq, gt, sql } from "drizzle-orm";

import { assessmentCallsTable } from "./schema.server";

type AssessmentCallRow = typeof assessmentCallsTable.$inferSelect;

type AssessmentCallAppointment = {
  appointmentKind: "assessment_call";
  appointmentId: string;
};

export type AssessmentCallCoachTime = {
  reserve: (
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

  private get executor() {
    return executorOf(this.options.database);
  }

  async reserve(
    command: ReserveAssessmentCallCommand,
  ): Promise<ReservationDecision> {
    const { call } = command;

    await this.executor.execute(
      sql`select pg_advisory_xact_lock(hashtext(${call.visitorEmail}))`,
    );

    const upcomingCallForEmail = await this.findUpcomingCallForEmail(command);

    await this.executor.execute(sql`savepoint ${RESERVATION_SAVEPOINT}`);

    await this.insertCall(call);
    const coachTime = await this.options.coachTime.reserve({
      ...ASSESSMENT_CALL_RULES.coachTimeFrom(call.startsAt),
      appointmentKind: "assessment_call",
      appointmentId: call.id,
    });
    const decision = AssessmentCall.decideReservation({
      coachTime: coachTime.status,
      upcomingCallForEmail,
    });

    if (decision.status !== "reserved") {
      await this.executor.execute(
        sql`rollback to savepoint ${RESERVATION_SAVEPOINT}`,
      );
    }

    return decision;
  }

  async findById(id: string): Promise<AssessmentCall | null> {
    try {
      const [row] = await this.executor
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
    const rows = await this.executor
      .select()
      .from(assessmentCallsTable)
      .orderBy(assessmentCallsTable.startsAt);

    return rows.map((row) => this.toAssessmentCall(row));
  }

  private async findUpcomingCallForEmail(
    command: ReserveAssessmentCallCommand,
  ): Promise<AssessmentCall | null> {
    const [row] = await this.executor
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

  private async insertCall(call: AssessmentCall): Promise<void> {
    await this.executor.insert(assessmentCallsTable).values({
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
