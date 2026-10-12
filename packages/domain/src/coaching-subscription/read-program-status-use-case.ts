import {
  ClientJourney,
  type ClientJourneys,
  type StepAfterSubmission,
} from "../client-journey";
import type { Clock } from "../shared";

import type { CoachingSubscriptions } from "./coaching-subscriptions";

type ProgramStatus = {
  kind: StepAfterSubmission;
  submittedAt: Date;
  workStartsOn: Date | null;
  startNowUntil: Date | null;
};

type ReadProgramStatusUseCaseOptions = {
  clock: Clock;
  journeys: Pick<ClientJourneys, "findByAuthSubjectId">;
  subscriptions: Pick<CoachingSubscriptions, "findCurrentForClient">;
};

export class ReadProgramStatusUseCase {
  constructor(private readonly options: ReadProgramStatusUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ProgramStatus | null> {
    const journey =
      await this.options.journeys.findByAuthSubjectId(authSubjectId);

    if (!journey?.onboardingSubmittedAt) {
      return null;
    }

    const step = journey.step();

    if (!ClientJourney.isAfterSubmission(step)) {
      return null;
    }

    const subscription = await this.options.subscriptions.findCurrentForClient(
      journey.clientId,
    );

    const upcomingWorkStart =
      subscription?.upcomingWorkStart(this.options.clock.now()) ?? null;

    return {
      kind: step,
      submittedAt: journey.onboardingSubmittedAt,
      workStartsOn: upcomingWorkStart,
      startNowUntil: upcomingWorkStart,
    };
  }
}
