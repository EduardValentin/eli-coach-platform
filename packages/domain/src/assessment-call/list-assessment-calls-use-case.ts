import type { CoachAvailabilitySource } from "../coach-availability";

import type { AssessmentCallSnapshot } from "./assessment-call";
import type { AssessmentCallReservations } from "./assessment-call-reservations";

export type AssessmentCallListing = {
  coachTimeZone: string;
  calls: AssessmentCallSnapshot[];
};

type ListAssessmentCallsUseCaseOptions = {
  availability: CoachAvailabilitySource;
  reservations: AssessmentCallReservations;
};

export class ListAssessmentCallsUseCase {
  constructor(private readonly options: ListAssessmentCallsUseCaseOptions) {}

  async execute(): Promise<AssessmentCallListing> {
    const [availability, calls] = await Promise.all([
      this.options.availability.current(),
      this.options.reservations.listAll(),
    ]);

    return {
      coachTimeZone: availability.timeZone,
      calls: calls.map((call) => call.toSnapshot()),
    };
  }
}
