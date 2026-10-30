import type { ClockPort } from "../clock-port";

import type { ClientJourneysPort } from "./client-journeys-port";

type MarkWelcomeSeenResult =
  { status: "welcome-seen" } | { status: "not-on-journey" };

type MarkWelcomeSeenUseCaseOptions = {
  clockPort: ClockPort;
  clientJourneysPort: ClientJourneysPort;
};

export class MarkWelcomeSeenUseCase {
  constructor(private readonly options: MarkWelcomeSeenUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<MarkWelcomeSeenResult> {
    const journey =
      await this.options.clientJourneysPort.findByAuthSubjectId(authSubjectId);

    if (!journey) {
      return { status: "not-on-journey" };
    }

    if (journey.step() === "welcome") {
      await this.options.clientJourneysPort.recordWelcomeSeen({
        clientId: journey.clientId,
        at: this.options.clockPort.now(),
      });
    }

    return { status: "welcome-seen" };
  }
}
