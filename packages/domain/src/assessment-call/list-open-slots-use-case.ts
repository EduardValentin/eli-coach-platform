import type {
  CoachAvailability,
  CoachAvailabilitySource,
  CoachCalendar,
  TimeInterval,
} from "../coach-availability";
import type { Clock, Logger } from "../shared";

import { ASSESSMENT_CALL_RULES } from "./assessment-call-rules";

export type OpenSlotsResult =
  | { status: "closed" }
  | { status: "open"; coachTimeZone: string; slots: Date[] }
  | { status: "unavailable" };

type ListOpenSlotsUseCaseOptions = {
  availability: CoachAvailabilitySource;
  bookingOpen: boolean;
  calendar: CoachCalendar;
  clock: Clock;
  logger: Logger;
};

type SlotSources = {
  availability: CoachAvailability;
  busy: TimeInterval[];
};

export class ListOpenSlotsUseCase {
  constructor(private readonly options: ListOpenSlotsUseCaseOptions) {}

  async execute(): Promise<OpenSlotsResult> {
    if (!this.options.bookingOpen) {
      return { status: "closed" };
    }

    const now = this.options.clock.now();
    const sources = await this.readSources(now);

    if (!sources) {
      this.options.logger.error("Assessment call slots could not be read.", {
        errorCategory: "assessment_call_slots_failure",
      });

      return { status: "unavailable" };
    }

    return {
      status: "open",
      coachTimeZone: sources.availability.timeZone,
      slots: sources.availability.openSlotStarts({
        now,
        policy: ASSESSMENT_CALL_RULES,
        busy: sources.busy,
      }),
    };
  }

  private async readSources(now: Date): Promise<SlotSources | null> {
    try {
      return {
        availability: await this.options.availability.current(),
        busy: await this.options.calendar.busyFrom(now),
      };
    } catch {
      return null;
    }
  }
}
