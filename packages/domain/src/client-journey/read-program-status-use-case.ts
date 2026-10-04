import type { CoachingSubscriptions } from "../coaching-subscription";
import type { Clock } from "../shared";

import type { ClientJourneyStep } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";

type ProgramStatus = {
  kind: Exclude<ClientJourneyStep, "welcome" | "onboarding">;
  submittedAt: Date;
  workStartsOn: Date | null;
  startNowUntil: Date | null;
};

type ReadProgramStatusUseCaseOptions = {
  clock: Clock;
  journeys: ClientJourneys;
  subscriptions: CoachingSubscriptions;
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

    if (step === "welcome" || step === "onboarding") {
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
