import type { CoachingSubscriptions } from "../coaching-subscription";
import type { Clock } from "../shared";

import { ClientJourney } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";

export type ClientPortalAccess = "open" | "ended";

type ClientPortal = "open" | "closed";

type ClientPortalStandingReading = {
  journey: ClientJourney;
  access: ClientPortalAccess;
  portal: ClientPortal;
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

    const access = ended ? "ended" : "open";

    return {
      journey,
      access,
      portal: ReadClientPortalStandingUseCase.portalOf(journey, access),
    };
  }

  private static portalOf(
    journey: ClientJourney,
    access: ClientPortalAccess,
  ): ClientPortal {
    const open =
      access === "open" && ClientJourney.isAfterSubmission(journey.step());

    return open ? "open" : "closed";
  }
}
