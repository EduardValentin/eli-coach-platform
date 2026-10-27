import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { eq, sql } from "drizzle-orm";

import {
  COACH_TIME_RESERVATIONS_NO_OVERLAP,
  coachTimeReservationsTable,
  type AppointmentKind,
} from "../schema.server";

type Appointment = {
  appointmentKind: AppointmentKind;
  appointmentId: string;
};

type CoachTimeReservation = Appointment & {
  start: Date;
  end: Date;
};

type CoachTimeReservationResult = { status: "reserved" } | { status: "taken" };

export type CoachTimeReservations = {
  reserve: (
    reservation: CoachTimeReservation,
  ) => Promise<CoachTimeReservationResult>;
  release: (appointment: Appointment) => Promise<void>;
};

const EXCLUSION_VIOLATION_CODE = "23P01";
const COACH_TIME_LOCK = "coach-time-reservations";

export async function reserveCoachTime(
  database: DatabaseClient,
  reservation: CoachTimeReservation,
): Promise<CoachTimeReservationResult> {
  const executor = executorOf(database);

  await executor.execute(
    sql`select pg_advisory_xact_lock(hashtext(${COACH_TIME_LOCK}))`,
  );

  try {
    await executor.transaction((savepoint) =>
      savepoint.insert(coachTimeReservationsTable).values({
        startsAt: reservation.start,
        endsAt: reservation.end,
        ...ownerValuesOf(reservation),
      }),
    );
  } catch (error) {
    if (!isOverlapViolation(error)) {
      throw error;
    }

    return { status: "taken" };
  }

  return { status: "reserved" };
}

export async function releaseCoachTime(
  database: DatabaseClient,
  appointment: Appointment,
): Promise<void> {
  await executorOf(database)
    .delete(coachTimeReservationsTable)
    .where(eq(ownerColumnOf(appointment), appointment.appointmentId));
}

function ownerValuesOf(appointment: Appointment) {
  switch (appointment.appointmentKind) {
    case "assessment_call":
      return { assessmentCallId: appointment.appointmentId };
    case "check_in":
      return { checkInId: appointment.appointmentId };
  }
}

function ownerColumnOf(appointment: Appointment) {
  switch (appointment.appointmentKind) {
    case "assessment_call":
      return coachTimeReservationsTable.assessmentCallId;
    case "check_in":
      return coachTimeReservationsTable.checkInId;
  }
}

function isOverlapViolation(error: unknown): boolean {
  return isCausedByDatabaseError(
    error,
    ({ code, constraint }) =>
      code === EXCLUSION_VIOLATION_CODE &&
      constraint === COACH_TIME_RESERVATIONS_NO_OVERLAP,
  );
}
