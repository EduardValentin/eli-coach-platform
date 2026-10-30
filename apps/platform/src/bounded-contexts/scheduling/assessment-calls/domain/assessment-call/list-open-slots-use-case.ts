import type { ClockPort } from "../clock-port";

import type { AssessmentCallBookingWindow } from "./assessment-call-booking-window";
import type { AssessmentCallIncidentsPort } from "./assessment-call-incidents-port";
import type {
  CoachAvailabilityPort,
  CoachAvailabilityReading,
} from "./coach-availability-port";
import type { CoachTimeSpan } from "./coach-time-port";

export type OpenSlotsResult =
  | { status: "closed" }
  | { status: "open"; coachTimeZone: string; slots: Date[] }
  | { status: "unavailable" };

type ListOpenSlotsUseCaseOptions = {
  availability: CoachAvailabilityPort;
  bookingWindow: AssessmentCallBookingWindow;
  clock: ClockPort;
  incidents: AssessmentCallIncidentsPort;
};

type SlotSources = {
  availability: CoachAvailabilityReading;
  busy: CoachTimeSpan[];
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
      slots: sources.availability.openStarts({ now, busy: sources.busy }),
    };
  }

  private async readSources(now: Date): Promise<SlotSources | null> {
    try {
      return {
        availability: await this.options.availability.current(),
        busy: await this.options.availability.busyFrom(now),
      };
    } catch {
      return null;
    }
  }
}
