import type { CoachTimePort } from "./coach-time-port";

export async function releaseFreedHours(
  coachTime: Pick<CoachTimePort, "release">,
  freedReservationIds: readonly (string | null)[],
): Promise<void> {
  for (const reservationId of freedReservationIds.filter(isReservationId)) {
    await coachTime.release(reservationId);
  }
}

function isReservationId(id: string | null): id is string {
  return id !== null;
}
