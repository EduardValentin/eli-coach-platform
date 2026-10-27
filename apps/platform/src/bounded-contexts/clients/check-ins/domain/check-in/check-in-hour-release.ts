import type { CoachTime } from "./coach-time";

export async function releaseFreedHours(
  coachTime: Pick<CoachTime, "release">,
  freedReservationIds: readonly (string | null)[],
): Promise<void> {
  for (const reservationId of freedReservationIds) {
    if (reservationId !== null) {
      await coachTime.release(reservationId);
    }
  }
}
