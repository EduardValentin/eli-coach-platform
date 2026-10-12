import { portalReachOf, type PortalReach } from "../client";
import type { Clock } from "../shared";

import type { ClientJourney } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";

type ClientPortalStandingReading = {
  journey: ClientJourney;
  portal: PortalReach;
};

type ReadClientPortalStandingUseCaseOptions = {
  clock: Clock;
  journeys: ClientJourneys;
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
