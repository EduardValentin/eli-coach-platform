import type { CoachTimeReservations } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { CoachTimeFacade } from "~/bounded-contexts/scheduling/public/coach-time";

export function createCoachTimeFacade(
  reservations: CoachTimeReservations,
): CoachTimeFacade {
  return {
    reserve: ({ startsAt, endsAt }) =>
      reservations.reserve({
        start: new Date(startsAt),
        end: new Date(endsAt),
      }),
    release: (reservationId) => reservations.release(reservationId),
  };
}
