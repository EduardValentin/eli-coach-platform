import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import type { StartNowRefusal } from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";

type StartProgramNowResult =
  | { status: "started" }
  | { status: "refused"; reason: StartNowRefusal }
  | { status: "not_found" };

type StartProgramNowUseCaseOptions = {
  clientReach: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  incidents: CoachingSubscriptionIncidents;
  subscriptions: CoachingSubscriptions;
};

export class StartProgramNowUseCase {
  constructor(private readonly options: StartProgramNowUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<StartProgramNowResult> {
    const client =
      await this.options.clientReach.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return { status: "not_found" };
    }

    const { clientId } = client;
    const now = this.options.clock.now();
    const first = await this.attempt(clientId, now);
    const result =
      first === "stale" ? await this.attempt(clientId, now) : first;

    if (result === "stale") {
      throw new Error(
        "The coaching subscription kept changing while starting the program now.",
      );
    }

    return result;
  }

  private async attempt(
    clientId: string,
    now: Date,
  ): Promise<StartProgramNowResult | "stale"> {
    const current =
      await this.options.subscriptions.findCurrentForClient(clientId);

    if (!current) {
      return { status: "not_found" };
    }

    const decision = current.startNow(now);

    if (decision.outcome === "refused") {
      return { status: "refused", reason: decision.reason };
    }

    const saved = await this.options.subscriptions.save({
      subscription: decision.subscription,
      previous: current,
    });

    if (saved === "stale") {
      return "stale";
    }

    this.options.incidents.programStartedNow({ subscriptionId: current.id });

    return { status: "started" };
  }
}
