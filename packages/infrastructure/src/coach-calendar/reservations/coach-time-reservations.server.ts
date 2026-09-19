import {
  isCausedByDatabaseError,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
import { and, eq } from "drizzle-orm";

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

const EXCLUSION_VIOLATION_CODE = "23P01";

export async function reserveCoachTime(
  transaction: DatabaseTransaction,
  reservation: CoachTimeReservation,
): Promise<CoachTimeReservationResult> {
  try {
    await transaction.transaction((savepoint) =>
      savepoint.insert(coachTimeReservationsTable).values({
        startsAt: reservation.start,
        endsAt: reservation.end,
        appointmentKind: reservation.appointmentKind,
        appointmentId: reservation.appointmentId,
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
  transaction: DatabaseTransaction,
  appointment: Appointment,
): Promise<void> {
  await transaction
    .delete(coachTimeReservationsTable)
    .where(
      and(
        eq(
          coachTimeReservationsTable.appointmentKind,
          appointment.appointmentKind,
        ),
        eq(coachTimeReservationsTable.appointmentId, appointment.appointmentId),
      ),
    );
}

function isOverlapViolation(error: unknown): boolean {
  return isCausedByDatabaseError(
    error,
    ({ code, constraint }) =>
      code === EXCLUSION_VIOLATION_CODE &&
      constraint === COACH_TIME_RESERVATIONS_NO_OVERLAP,
  );
}
