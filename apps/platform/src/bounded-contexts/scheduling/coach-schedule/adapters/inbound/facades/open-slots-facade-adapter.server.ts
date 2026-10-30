import {
  SlotPolicy,
  type CoachOpenings,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type {
  OpenSlotsFacade,
  OpenSlotsRequest,
  OfferedStartRequest,
} from "~/bounded-contexts/scheduling/public/open-slots-facade";

export class OpenSlotsFacadeAdapter implements OpenSlotsFacade {
  constructor(private readonly openings: CoachOpenings) {}

  async openStarts(request: OpenSlotsRequest) {
    const starts = await this.openings.openStarts({
      now: new Date(request.from),
      policy: this.policyOf(request),
    });

    return starts.map((start) => start.toISOString());
  }

  offersStart(request: OfferedStartRequest) {
    return this.openings.offers({
      start: new Date(request.startsAt),
      now: new Date(request.from),
      policy: this.policyOf(request),
    });
  }

  async coachWeek() {
    const week = await this.openings.week();

    return {
      timeZone: week.timeZone,
      weekdays: [...week.weekdays],
      hours: week.weeklyHours(),
    };
  }

  async busyFrom(from: string) {
    const busy = await this.openings.busyFrom(new Date(from));

    return busy.map((interval) => ({
      startsAt: interval.start.toISOString(),
      endsAt: interval.end.toISOString(),
    }));
  }

  private policyOf(request: OpenSlotsRequest): SlotPolicy {
    return SlotPolicy.of({
      durationMinutes: request.durationMinutes,
      bufferMinutes: request.bufferMinutes,
      stepMinutes: request.stepMinutes,
      horizonDays: request.horizonDays,
      leadMinutes: request.leadMinutes,
    });
  }
}
