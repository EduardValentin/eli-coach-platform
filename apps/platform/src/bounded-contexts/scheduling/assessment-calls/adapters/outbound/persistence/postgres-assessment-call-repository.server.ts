import {
  AssessmentCall,
  type AssessmentCallReservation,
  type AssessmentCallReservationsPort,
  type UpcomingCallQuestion,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { and, eq, gt, sql } from "drizzle-orm";

import { assessmentCallsTable } from "./schema.server";

type AssessmentCallRow = typeof assessmentCallsTable.$inferSelect;

const UNREADABLE_IDENTIFIER_CODE = "22P02";

export class PostgresAssessmentCallRepository implements AssessmentCallReservationsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async lockVisitorEmail(visitorEmail: string): Promise<void> {
    await this.executor.execute(
      sql`select pg_advisory_xact_lock(hashtext(${visitorEmail}))`,
    );
  }

  async findUpcomingCallFor({
    visitorEmail,
    now,
  }: UpcomingCallQuestion): Promise<AssessmentCall | null> {
    const [row] = await this.executor
      .select()
      .from(assessmentCallsTable)
      .where(
        and(
          eq(assessmentCallsTable.visitorEmail, visitorEmail),
          gt(assessmentCallsTable.startsAt, now),
        ),
      )
      .orderBy(assessmentCallsTable.startsAt)
      .limit(1);

    return row ? this.toAssessmentCall(row) : null;
  }

  async add({ call, reservationId }: AssessmentCallReservation): Promise<void> {
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
      reservationId,
    });
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
