import type { ClockPort } from "../clock-port";

import type { ClientJourneysPort } from "./client-journeys-port";

type MarkWelcomeSeenResult =
  { status: "welcome-seen" } | { status: "not-on-journey" };

type MarkWelcomeSeenUseCaseOptions = {
  clock: ClockPort;
  journeys: ClientJourneysPort;
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
