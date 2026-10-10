import type { CoachingSubscriptions } from "../coaching-subscription";
import type { Clock } from "../shared";

import { ClientJourney } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";

export type CoachingStanding = "active" | "ended";

export type PortalReach = "reachable" | "unreachable";

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
      portal: this.portalReachOf(journey, coaching),
    };
  }

  private portalReachOf(
    journey: ClientJourney,
    coaching: CoachingStanding,
  ): PortalReach {
    const reachable =
      coaching === "active" && ClientJourney.isAfterSubmission(journey.step());

    return reachable ? "reachable" : "unreachable";
  }
}
