import type {
  CoachAvailability,
  CoachAvailabilitySource,
} from "../coach-availability";
import type { Clock, Logger } from "../shared";

import type { AssessmentCallReservations } from "./assessment-call-reservations";

export type OpenSlotsResult =
  | { status: "closed" }
  | { status: "open"; coachTimeZone: string; slots: Date[] }
  | { status: "unavailable" };

type ListOpenSlotsUseCaseOptions = {
  availability: CoachAvailabilitySource;
  bookingOpen: boolean;
  clock: Clock;
  logger: Logger;
  reservations: AssessmentCallReservations;
};

type SlotSources = {
  availability: CoachAvailability;
  reservedStarts: Date[];
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
        reservedStarts: sources.reservedStarts,
      }),
    };
  }

  private async readSources(now: Date): Promise<SlotSources | null> {
    try {
      return {
        availability: await this.options.availability.current(),
        reservedStarts: await this.options.reservations.reservedStartsFrom(now),
      };
    } catch {
      return null;
    }
  }
}
