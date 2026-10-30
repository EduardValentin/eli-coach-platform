import {
  CoachWeek,
  weekdayNamed,
  type CheckInSlotRules,
  type CoachTimeSpan,
  type OpenSlotsPort,
  type Weekday,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type {
  OpenSlotsFacade,
  OpenSlotsRequest,
} from "~/bounded-contexts/scheduling/public/open-slots-facade";

type SchedulingOpenSlotsOptions = {
  openSlots: OpenSlotsFacade;
  rules: CheckInSlotRules;
};

export class SchedulingOpenSlotsAdapter implements OpenSlotsPort {
  constructor(private readonly options: SchedulingOpenSlotsOptions) {}

  async coachWeek(): Promise<CoachWeek> {
    const week = await this.options.openSlots.coachWeek();

    return CoachWeek.of({
      timeZone: week.timeZone,
      weekdays: week.weekdays.flatMap((name): Weekday[] => {
        const weekday = weekdayNamed(name);

        return weekday ? [weekday] : [];
      }),
      hours: week.hours,
    });
  }

  offersStart({ start, now }: { start: Date; now: Date }): Promise<boolean> {
    return this.options.openSlots.offersStart({
      ...this.requestFrom(now),
      startsAt: start.toISOString(),
    });
  }

  async openStarts(now: Date): Promise<Date[]> {
    const starts = await this.options.openSlots.openStarts(
      this.requestFrom(now),
    );

    return starts.map((start) => new Date(start));
  }

  async busyFrom(from: Date): Promise<CoachTimeSpan[]> {
    const busy = await this.options.openSlots.busyFrom(from.toISOString());

    return busy.map((interval) => ({
      start: new Date(interval.startsAt),
      end: new Date(interval.endsAt),
    }));
  }

  private requestFrom(now: Date): OpenSlotsRequest {
    const { rules } = this.options;

    return {
      from: now.toISOString(),
      durationMinutes: rules.durationMinutes,
      bufferMinutes: rules.bufferMinutes,
      stepMinutes: rules.stepMinutes,
      horizonDays: rules.horizonDays,
      leadMinutes: rules.leadMinutes,
    };
  }
}
