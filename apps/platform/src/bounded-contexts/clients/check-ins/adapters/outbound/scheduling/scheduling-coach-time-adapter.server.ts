import type {
  CoachTimePort,
  CoachTimeHold,
  CoachTimeSpan,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { CoachTimeFacade } from "~/bounded-contexts/scheduling/public/coach-time-facade";

export class SchedulingCoachTimeAdapter implements CoachTimePort {
  constructor(private readonly coachTimeFacade: CoachTimeFacade) {}

  reserve(span: CoachTimeSpan): Promise<CoachTimeHold> {
    return this.coachTimeFacade.reserve({
      startsAt: span.start.toISOString(),
      endsAt: span.end.toISOString(),
    });
  }

  release(reservationId: string): Promise<void> {
    return this.coachTimeFacade.release(reservationId);
  }
}
