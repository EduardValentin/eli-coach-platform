import {
  SlotPolicy,
  type CoachOpenings,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type {
  OpenSlotsFacade,
  OpenSlotsRequest,
} from "~/bounded-contexts/scheduling/public/open-slots";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const MINUTES_PER_HOUR = 60;

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
    horizonDays: Math.floor(
      (Date.parse(request.to) - Date.parse(request.from)) /
        MILLISECONDS_PER_DAY,
    ),
    leadMinutes: request.leadTimeHours * MINUTES_PER_HOUR,
  });
}
