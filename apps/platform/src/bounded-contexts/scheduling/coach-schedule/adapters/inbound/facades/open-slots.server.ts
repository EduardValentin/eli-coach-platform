import {
  SlotPolicy,
  type CoachOpenings,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type {
  OpenSlotsFacade,
  OpenSlotsRequest,
} from "~/bounded-contexts/scheduling/public/open-slots";

export function createOpenSlotsFacade(
  openings: CoachOpenings,
): OpenSlotsFacade {
  return {
    openStarts: async (request) => {
      const starts = await openings.openStarts({
        now: new Date(request.from),
        policy: policyOf(request),
      });

      return starts.map((start) => start.toISOString());
    },
    offersStart: (request) =>
      openings.offers({
        start: new Date(request.startsAt),
        now: new Date(request.from),
        policy: policyOf(request),
      }),
    coachWeek: async () => {
      const week = await openings.week();

      return {
        timeZone: week.timeZone,
        weekdays: [...week.weekdays],
        hours: week.weeklyHours(),
      };
    },
    busyFrom: async (from) => {
      const busy = await openings.busyFrom(new Date(from));

      return busy.map((interval) => ({
        startsAt: interval.start.toISOString(),
        endsAt: interval.end.toISOString(),
      }));
    },
  };
}

function policyOf(request: OpenSlotsRequest): SlotPolicy {
  return SlotPolicy.of({
    durationMinutes: request.durationMinutes,
    bufferMinutes: request.bufferMinutes,
    stepMinutes: request.stepMinutes,
    horizonDays: request.horizonDays,
    leadMinutes: request.leadMinutes,
  });
}
