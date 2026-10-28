import type { CoachTime } from "./coach-time";

export async function releaseFreedHours(
  coachTime: Pick<CoachTime, "release">,
  freedReservationIds: readonly (string | null)[],
): Promise<void> {
  for (const reservationId of freedReservationIds.filter(isReservationId)) {
    await coachTime.release(reservationId);
  }
}

function isReservationId(id: string | null): id is string {
  return id !== null;
}
