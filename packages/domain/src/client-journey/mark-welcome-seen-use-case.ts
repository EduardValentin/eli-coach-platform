import type { Clock } from "../shared";

import type { ClientJourneys } from "./client-journeys";

type MarkWelcomeSeenResult =
  { status: "welcome-seen" } | { status: "not-on-journey" };

type MarkWelcomeSeenUseCaseOptions = {
  clock: Clock;
  journeys: ClientJourneys;
};

export class MarkWelcomeSeenUseCase {
  constructor(private readonly options: MarkWelcomeSeenUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<MarkWelcomeSeenResult> {
    const journey =
      await this.options.journeys.findByAuthSubjectId(authSubjectId);

    if (!journey) {
      return { status: "not-on-journey" };
    }

    if (journey.step() === "welcome") {
      await this.options.journeys.recordWelcomeSeen({
        clientId: journey.clientId,
        at: this.options.clock.now(),
      });
    }

    return { status: "welcome-seen" };
  }
}
