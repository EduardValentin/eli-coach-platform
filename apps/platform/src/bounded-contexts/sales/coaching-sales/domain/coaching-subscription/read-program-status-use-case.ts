import type { ClockPort } from "../clock-port";

import type { ClientLookupPort } from "./client-lookup-port";

import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";
import { isAfterSubmission, type StepAfterSubmission } from "./program-steps";

type ProgramStatus = {
  kind: StepAfterSubmission;
  submittedAt: Date;
  workStartsOn: Date | null;
  startNowUntil: Date | null;
};

type ReadProgramStatusUseCaseOptions = {
  clockPort: ClockPort;
  clientLookupPort: Pick<ClientLookupPort, "journeyOf">;
  coachingSubscriptionsPort: Pick<
    CoachingSubscriptionsPort,
    "findCurrentForClient"
  >;
};

export class ReadProgramStatusUseCase {
  constructor(private readonly options: ReadProgramStatusUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ProgramStatus | null> {
    const journey =
      await this.options.clientLookupPort.journeyOf(authSubjectId);

    if (!journey?.onboardingSubmittedAt) {
      return null;
    }

    const step = journey.step;

    if (!isAfterSubmission(step)) {
      return null;
    }

    const subscription =
      await this.options.coachingSubscriptionsPort.findCurrentForClient(
        journey.clientId,
      );

    const upcomingWorkStart =
      subscription?.upcomingWorkStart(this.options.clockPort.now()) ?? null;

    return {
      kind: step,
      submittedAt: journey.onboardingSubmittedAt,
      workStartsOn: upcomingWorkStart,
      startNowUntil: upcomingWorkStart,
    };
  }
}
