import type { Clock } from "../shared";

import type { CoachingPeriodHandler } from "./coaching-period-handler";
import { CoachingPeriodPropagation } from "./coaching-period-propagation";
import type {
  CoachingSubscription,
  StartNowRefusal,
} from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import type { PaymentSubscriptions } from "./payment-subscriptions";
import type { SignedInSubscriptions } from "./signed-in-subscriptions";

type StartProgramNowResult =
  | { status: "started" }
  | { status: "refused"; reason: StartNowRefusal }
  | { status: "not_found" };

type StartProgramNowUseCaseOptions = {
  clock: Clock;
  coachingPeriods: readonly CoachingPeriodHandler[];
  incidents: CoachingSubscriptionIncidents;
  paymentSubscriptions: Pick<PaymentSubscriptions, "liftRenewalHold">;
  signedInSubscriptions: Pick<SignedInSubscriptions, "currentFor">;
  subscriptions: Pick<CoachingSubscriptions, "save">;
};

export class StartProgramNowUseCase {
  private readonly coachingPeriod: CoachingPeriodPropagation;

  constructor(private readonly options: StartProgramNowUseCaseOptions) {
    this.coachingPeriod = new CoachingPeriodPropagation(options);
  }

  async execute(authSubjectId: string): Promise<StartProgramNowResult> {
    const now = this.options.clock.now();
    const first = await this.attempt(authSubjectId, now);
    const result =
      first === "stale" ? await this.attempt(authSubjectId, now) : first;

    if (result === "stale") {
      throw new Error(
        "The coaching subscription kept changing while starting the program now.",
      );
    }

    return result;
  }

  private async attempt(
    authSubjectId: string,
    now: Date,
  ): Promise<StartProgramNowResult | "stale"> {
    const current =
      await this.options.signedInSubscriptions.currentFor(authSubjectId);

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
    await this.coachingPeriod.propagateProgramStart(decision.subscription);
    await this.liftRenewalHold(decision.subscription);

    return { status: "started" };
  }

  private async liftRenewalHold(
    subscription: CoachingSubscription,
  ): Promise<void> {
    const { paymentSubscriptionId } = subscription;

    try {
      await this.options.paymentSubscriptions.liftRenewalHold(
        paymentSubscriptionId,
      );
    } catch (error) {
      this.options.incidents.renewalHoldLiftFailed({
        paymentSubscriptionId,
        error,
      });
    }
  }
}
