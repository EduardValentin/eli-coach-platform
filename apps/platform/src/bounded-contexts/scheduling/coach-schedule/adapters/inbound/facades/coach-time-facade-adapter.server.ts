import type { CoachTimeReservationsPort } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type {
  CoachTimeFacade,
  CoachTimeRequest,
} from "~/bounded-contexts/scheduling/public/coach-time-facade";

export class CoachTimeFacadeAdapter implements CoachTimeFacade {
  constructor(private readonly reservations: CoachTimeReservationsPort) {}

  reserve({ startsAt, endsAt }: CoachTimeRequest) {
    return this.reservations.reserve({
      start: new Date(startsAt),
      end: new Date(endsAt),
    });
  }

  release(reservationId: string) {
    return this.reservations.release(reservationId);
  }
}
