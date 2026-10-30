import type { CoachTimeReservationsPort } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type {
  CoachTimeFacade,
  CoachTimeRequest,
} from "~/bounded-contexts/scheduling/public/coach-time-facade";

export class CoachTimeFacadeAdapter implements CoachTimeFacade {
  constructor(
    private readonly coachTimeReservationsPort: CoachTimeReservationsPort,
  ) {}

  reserve({ startsAt, endsAt }: CoachTimeRequest) {
    return this.coachTimeReservationsPort.reserve({
      start: new Date(startsAt),
      end: new Date(endsAt),
    });
  }

  release(reservationId: string) {
    return this.coachTimeReservationsPort.release(reservationId);
  }
}
