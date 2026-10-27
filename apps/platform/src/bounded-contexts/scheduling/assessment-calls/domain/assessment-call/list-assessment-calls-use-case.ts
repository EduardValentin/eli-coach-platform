import type { AssessmentCall, AssessmentCallSnapshot } from "./assessment-call";
import type { AssessmentCallIncidents } from "./assessment-call-incidents";
import type { AssessmentCallReservations } from "./assessment-call-reservations";
import type {
  CoachAvailability,
  CoachAvailabilityReading,
} from "./coach-availability";

export type AssessmentCallListingResult =
  | { status: "ok"; coachTimeZone: string; calls: AssessmentCallSnapshot[] }
  | { status: "unavailable" };

type ListAssessmentCallsUseCaseOptions = {
  availability: CoachAvailability;
  incidents: AssessmentCallIncidents;
  reservations: AssessmentCallReservations;
};

type ListingSources = {
  availability: CoachAvailabilityReading;
  calls: AssessmentCall[];
};

export class ListAssessmentCallsUseCase {
  constructor(private readonly options: ListAssessmentCallsUseCaseOptions) {}

  async execute(): Promise<AssessmentCallListingResult> {
    const sources = await this.readSources();

    if (!sources) {
      this.options.incidents.callsReadFailed();

      return { status: "unavailable" };
    }

    return {
      status: "ok",
      coachTimeZone: sources.availability.timeZone,
      calls: sources.calls.map((call) => call.toSnapshot()),
    };
  }

  private async readSources(): Promise<ListingSources | null> {
    try {
      const [availability, calls] = await Promise.all([
        this.options.availability.current(),
        this.options.reservations.listAll(),
      ]);

      return { availability, calls };
    } catch {
      return null;
    }
  }
}
