import { programWorkStart } from "../coaching-subscription";

import type { ClientJourneys } from "./client-journeys";
import type { ClientSubscriptionStarts } from "./client-subscription-starts";

type ProgramStatus = {
  kind: "submitted";
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

    const start = await this.options.subscriptionStarts.findOpenForClient(
      journey.clientId,
    );

    return {
      kind: "submitted",
      submittedAt: journey.onboardingSubmittedAt,
      workStartsOn: start ? programWorkStart(start) : null,
    };
  }
}
