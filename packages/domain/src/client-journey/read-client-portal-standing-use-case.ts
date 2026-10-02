import type { CoachingSubscriptions } from "../coaching-subscription";
import type { Clock } from "../shared";

import type { ClientJourney } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";

export type ClientPortalAccess = "open" | "ended";

type ClientPortalStanding = {
  journey: ClientJourney;
  access: ClientPortalAccess;
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

  async execute(authSubjectId: string): Promise<ClientPortalStanding | null> {
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

    return { journey, access: ended ? "ended" : "open" };
  }
}
