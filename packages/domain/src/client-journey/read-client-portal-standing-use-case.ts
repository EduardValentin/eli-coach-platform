import type { CoachingSubscriptions } from "../coaching-subscription";
import type { Clock } from "../shared";

import {
  ClientJourney,
  type CoachingStanding,
  type PortalReach,
} from "./client-journey";
import type { ClientJourneys } from "./client-journeys";

type ClientPortalStandingReading = {
  journey: ClientJourney;
  coaching: CoachingStanding;
  portal: PortalReach;
};

type ReadClientPortalStandingUseCaseOptions = {
  clock: Clock;
  journeys: ClientJourneys;
  subscriptions: CoachingSubscriptions;
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

    const subscription = await this.options.subscriptions.findCurrentForClient(
      journey.clientId,
    );
    const ended =
      subscription !== null &&
      !subscription.hasPortalAccessAt(this.options.clock.now());

    const coaching = ended ? "ended" : "active";

    return {
      journey,
      coaching,
      portal: ClientJourney.portalReachOf({ step: journey.step(), coaching }),
    };
  }
}
