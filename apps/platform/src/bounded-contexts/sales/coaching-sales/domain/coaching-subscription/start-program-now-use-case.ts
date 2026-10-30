import type { ClockPort } from "../clock-port";

import type { CoachingPeriodHandlerPort } from "./coaching-period-handler-port";
import { CoachingPeriodPropagation } from "./coaching-period-propagation";
import type {
  CoachingSubscription,
  StartNowRefusal,
} from "./coaching-subscription";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";
import type { PaymentSubscriptionsPort } from "./payment-subscriptions-port";
import type { SignedInSubscriptions } from "./signed-in-subscriptions";

type StartProgramNowResult =
  | { status: "started" }
  | { status: "refused"; reason: StartNowRefusal }
  | { status: "not_found" };

type StartProgramNowUseCaseOptions = {
  clockPort: ClockPort;
  coachingPeriods: readonly CoachingPeriodHandlerPort[];
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
  paymentSubscriptionsPort: Pick<PaymentSubscriptionsPort, "liftRenewalHold">;
  signedInSubscriptions: Pick<SignedInSubscriptions, "currentFor">;
  coachingSubscriptionsPort: Pick<CoachingSubscriptionsPort, "save">;
};

export class StartProgramNowUseCase {
  private readonly coachingPeriod: CoachingPeriodPropagation;

  constructor(private readonly options: StartProgramNowUseCaseOptions) {
    this.coachingPeriod = new CoachingPeriodPropagation(options);
  }

  async execute(authSubjectId: string): Promise<StartProgramNowResult> {
    const now = this.options.clockPort.now();
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

    const saved = await this.options.coachingSubscriptionsPort.save({
      subscription: decision.subscription,
      previous: current,
    });

    if (saved === "stale") {
      return "stale";
    }

    this.options.coachingSubscriptionIncidentsPort.programStartedNow({
      subscriptionId: current.id,
    });
    await this.coachingPeriod.propagateProgramStart(decision.subscription);
    await this.liftRenewalHold(decision.subscription);

    return { status: "started" };
  }

  private async liftRenewalHold(
    subscription: CoachingSubscription,
  ): Promise<void> {
    const { paymentSubscriptionId } = subscription;

    try {
      await this.options.paymentSubscriptionsPort.liftRenewalHold(
        paymentSubscriptionId,
      );
    } catch (error) {
      this.options.coachingSubscriptionIncidentsPort.renewalHoldLiftFailed({
        paymentSubscriptionId,
        error,
      });
    }
  }
}
