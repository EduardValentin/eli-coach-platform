import type { CoachAvailabilitySource } from "../coach-availability";
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

export class ListOpenSlotsUseCase {
  constructor(private readonly options: ListOpenSlotsUseCaseOptions) {}

  async execute(): Promise<OpenSlotsResult> {
    if (!this.options.bookingOpen) {
      return { status: "closed" };
    }

    const now = this.options.clock.now();

    try {
      const availability = await this.options.availability.current();
      const reservedStarts =
        await this.options.reservations.reservedStartsFrom(now);

      return {
        status: "open",
        coachTimeZone: availability.timeZone,
        slots: availability.openSlotStarts({ now, reservedStarts }),
      };
    } catch {
      this.options.logger.error("Assessment call slots could not be read.", {
        errorCategory: "assessment_call_slots_failure",
      });

      return { status: "unavailable" };
    }
  }
}
