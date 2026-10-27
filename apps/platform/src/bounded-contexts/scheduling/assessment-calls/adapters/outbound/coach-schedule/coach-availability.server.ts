import type {
  CallSlotRules,
  CoachAvailability,
  CoachAvailabilityReading,
  CoachTimeSpan,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import {
  SlotPolicy,
  type CoachOpenings,
} from "~/bounded-contexts/scheduling/coach-schedule/public/coach-time";

type CoachScheduleAvailabilityOptions = {
  openings: CoachOpenings;
  rules: CallSlotRules;
};

export class CoachScheduleAvailability implements CoachAvailability {
  private readonly policy: SlotPolicy;

  constructor(private readonly options: CoachScheduleAvailabilityOptions) {
    this.policy = SlotPolicy.of(options.rules);
  }

  async current(): Promise<CoachAvailabilityReading> {
    const week = await this.options.openings.week();
    const { policy } = this;

    return {
      timeZone: week.timeZone,
      offersStart: ({ start, now }) => week.isOpenStart({ start, now, policy }),
      openStarts: ({ now, busy }) => week.openSlotStarts({ now, policy, busy }),
    };
  }

  busyFrom(from: Date): Promise<CoachTimeSpan[]> {
    return this.options.openings.busyFrom(from);
  }
}
