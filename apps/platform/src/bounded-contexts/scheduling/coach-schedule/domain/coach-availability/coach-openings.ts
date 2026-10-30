import type { CoachAvailability } from "./coach-availability";
import type { CoachAvailabilitySourcePort } from "./coach-availability-source-port";
import type { CoachCalendarPort } from "./coach-calendar-port";
import type { SlotPolicy } from "./slot-policy";
import type { TimeInterval } from "./time-interval";

type CoachOpeningsOptions = {
  availability: CoachAvailabilitySourcePort;
  calendar: CoachCalendarPort;
};

type OpeningsQuestion = { now: Date; policy: SlotPolicy };

type OfferedStartQuestion = OpeningsQuestion & { start: Date };

export class CoachOpenings {
  constructor(private readonly options: CoachOpeningsOptions) {}

  week(): Promise<CoachAvailability> {
    return this.options.availability.current();
  }

  async timeZone(): Promise<string> {
    return (await this.week()).timeZone;
  }

  async offers(question: OfferedStartQuestion): Promise<boolean> {
    return (await this.week()).isOpenStart(question);
  }

  async openStarts({ now, policy }: OpeningsQuestion): Promise<Date[]> {
    const availability = await this.week();
    const busy = await this.busyFrom(now);

    return availability.openSlotStarts({ now, policy, busy });
  }

  busyFrom(from: Date): Promise<TimeInterval[]> {
    return this.options.calendar.busyFrom(from);
  }
}
