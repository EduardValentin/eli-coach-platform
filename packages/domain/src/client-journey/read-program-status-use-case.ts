import { programWorkStart } from "../coaching-subscription";

import type { ClientJourneys } from "./client-journeys";
import type { ClientSubscriptionStarts } from "./client-subscription-starts";

type ProgramStatus = {
  kind: "submitted" | "in-review" | "needs-details" | "approved";
  submittedAt: Date;
  workStartsOn: Date | null;
};

type ReadProgramStatusUseCaseOptions = {
  journeys: ClientJourneys;
  subscriptionStarts: ClientSubscriptionStarts;
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

    const start = await this.options.subscriptionStarts.findOpenForClient(
      journey.clientId,
    );

    return {
      kind: step,
      submittedAt: journey.onboardingSubmittedAt,
      workStartsOn: start ? programWorkStart(start) : null,
    };
  }
}
