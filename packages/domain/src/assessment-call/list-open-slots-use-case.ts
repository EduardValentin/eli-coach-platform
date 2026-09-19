import type {
  CoachAvailability,
  CoachAvailabilitySource,
  CoachCalendar,
  TimeInterval,
} from "../coach-availability";
import type { Clock } from "../shared";

import type { AssessmentCallBookingWindow } from "./assessment-call-booking-window";
import type { AssessmentCallIncidents } from "./assessment-call-incidents";
import { ASSESSMENT_CALL_RULES } from "./assessment-call-rules";

export type OpenSlotsResult =
  | { status: "closed" }
  | { status: "open"; coachTimeZone: string; slots: Date[] }
  | { status: "unavailable" };

type ListOpenSlotsUseCaseOptions = {
  availability: CoachAvailabilitySource;
  bookingWindow: AssessmentCallBookingWindow;
  calendar: CoachCalendar;
  clock: Clock;
  incidents: AssessmentCallIncidents;
};

type SlotSources = {
  availability: CoachAvailability;
  busy: TimeInterval[];
};

export class ListOpenSlotsUseCase {
  constructor(private readonly options: ListOpenSlotsUseCaseOptions) {}

  async execute(): Promise<OpenSlotsResult> {
    if (!(await this.options.bookingWindow.isOpen())) {
      return { status: "closed" };
    }

    const now = this.options.clock.now();
    const sources = await this.readSources(now);

    if (!sources) {
      this.options.incidents.slotsReadFailed();

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
