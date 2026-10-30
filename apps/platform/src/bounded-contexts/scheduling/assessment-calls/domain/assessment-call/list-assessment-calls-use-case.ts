import type { AssessmentCall, AssessmentCallSnapshot } from "./assessment-call";
import type { AssessmentCallIncidentsPort } from "./assessment-call-incidents-port";
import type { AssessmentCallReservationsPort } from "./assessment-call-reservations-port";
import type {
  CoachAvailabilityPort,
  CoachAvailabilityReading,
} from "./coach-availability-port";

export type AssessmentCallListingResult =
  | { status: "ok"; coachTimeZone: string; calls: AssessmentCallSnapshot[] }
  | { status: "unavailable" };

type ListAssessmentCallsUseCaseOptions = {
  availability: CoachAvailabilityPort;
  incidents: AssessmentCallIncidentsPort;
  reservations: AssessmentCallReservationsPort;
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
