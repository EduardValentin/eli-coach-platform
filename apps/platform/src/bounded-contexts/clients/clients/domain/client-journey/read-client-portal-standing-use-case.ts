import { portalReachOf, type PortalReach } from "../client";
import type { ClockPort } from "../clock-port";

import type { ClientJourney } from "./client-journey";
import type { ClientJourneysPort } from "./client-journeys-port";

type ClientPortalStandingReading = {
  journey: ClientJourney;
  portal: PortalReach;
};

type ReadClientPortalStandingUseCaseOptions = {
  clock: ClockPort;
  journeys: ClientJourneysPort;
};

export class ReadClientPortalStandingUseCase {
  constructor(
    private readonly options: ReadClientPortalStandingUseCaseOptions,
  ) {}

  async execute(
    authSubjectId: string,
  ): Promise<ClientPortalStandingReading | null> {
    const journey =
      await this.options.journeys.findByAuthSubjectId(authSubjectId);

    if (!journey) {
      return null;
    }

    return {
      journey,
      portal: portalReachOf({
        standing: journey.standing,
        onboardingSubmittedAt: journey.onboardingSubmittedAt,
        now: this.options.clock.now(),
      }),
    };
  }
}
