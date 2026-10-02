import type { ClientIdentities } from "../client";
import type { Clock } from "../shared";

import type {
  CancellationRule,
  CoachingSubscription,
  CoachingSubscriptionSnapshot,
  ProviderInstruction,
  SubscriptionCancellation,
} from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import type { PaymentSubscriptions } from "./payment-subscriptions";
import type { RefundNotifications } from "./refund-notifications";

type CancelSubscriptionResult =
  | {
      status: "cancelled";
      rule: Exclude<CancellationRule, "none">;
      subscription: CoachingSubscriptionSnapshot;
    }
  | { status: "nothing_to_cancel" }
  | { status: "not_found" }
  | { status: "provider_unavailable" };

type RecordedCancellation = Extract<
  SubscriptionCancellation,
  { outcome: "cancelled" }
>;

type CancelSubscriptionUseCaseOptions = {
  clients: ClientIdentities;
  clock: Clock;
  incidents: CoachingSubscriptionIncidents;
  notifications: RefundNotifications;
  paymentSubscriptions: PaymentSubscriptions;
  subscriptions: CoachingSubscriptions;
};

type CancellationRecording = {
  authSubjectId: string;
  now: Date;
  previous: CoachingSubscription;
};

export class CancelSubscriptionUseCase {
  constructor(private readonly options: CancelSubscriptionUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<CancelSubscriptionResult> {
    const current =
      await this.options.subscriptions.findCurrentForAuthSubject(authSubjectId);

    if (!current) {
      return { status: "not_found" };
    }

    const now = this.options.clock.now();
    const decision = current.cancel(now);

    if (decision.outcome === "nothing-to-cancel") {
      return { status: "nothing_to_cancel" };
    }

    try {
      await this.instructProvider(current, decision.instruction);
    } catch (error) {
      this.options.incidents.subscriptionCancellationFailed({
        subscriptionId: current.id,
        rule: decision.rule,
        error,
      });

      return { status: "provider_unavailable" };
    }

    const recorded = await this.record(decision, {
      authSubjectId,
      now,
      previous: current,
    });

    if (!recorded) {
      return { status: "nothing_to_cancel" };
    }

    this.options.incidents.subscriptionCancelled({
      subscriptionId: recorded.subscription.id,
      startChoice: recorded.subscription.startChoice,
      rule: recorded.rule,
      refundDueCents: recorded.subscription.refund?.amountCents ?? 0,
    });
    await this.notifyCoach(recorded.subscription);

    return {
      status: "cancelled",
      rule: recorded.rule,
      subscription: recorded.subscription.toSnapshot(),
    };
  }

  private async instructProvider(
    subscription: CoachingSubscription,
    instruction: ProviderInstruction,
  ): Promise<void> {
    if (instruction.kind === "end-now") {
      await this.options.paymentSubscriptions.endNow(
        subscription.paymentSubscriptionId,
      );
      return;
    }

    await this.options.paymentSubscriptions.endAt({
      paymentSubscriptionId: subscription.paymentSubscriptionId,
      at: instruction.at,
    });
  }

  private async record(
    decision: RecordedCancellation,
    recording: CancellationRecording,
  ): Promise<RecordedCancellation | null> {
    const saved = await this.options.subscriptions.save({
      subscription: decision.subscription,
      previous: recording.previous,
    });

    if (saved === "saved") {
      return decision;
    }

    const fresh = await this.options.subscriptions.findCurrentForAuthSubject(
      recording.authSubjectId,
    );

    if (!fresh) {
      return null;
    }

    const redecided = redecide(decision, {
      fresh,
      cancelledAt: recording.now,
    });

    if (!redecided) {
      return null;
    }

    const savedAgain = await this.options.subscriptions.save({
      subscription: redecided.subscription,
      previous: fresh,
    });

    if (savedAgain === "stale") {
      throw new Error(
        `Coaching subscription ${fresh.id} kept changing while it was being cancelled.`,
      );
    }

    return redecided;
  }

  private async notifyCoach(subscription: CoachingSubscription): Promise<void> {
    const refund = subscription.refund;

    if (!refund || refund.amountCents === 0) {
      return;
    }

    try {
      const client = await this.options.clients.findByClientId(
        subscription.clientId,
      );
      const delivery =
        client && subscription.cancelledAt
          ? await this.options.notifications.notifyRefundDue({
              subscriptionId: subscription.id,
              client: {
                clientId: client.clientId,
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
              },
              paid: {
                amountCents: subscription.amountCents,
                currency: subscription.currency,
                at: subscription.paidAt,
              },
              cancelledAt: subscription.cancelledAt,
              refund: refund.toSnapshot(),
            })
          : "failed";

      if (delivery === "failed") {
        this.reportNotificationFailure(subscription);
      }
    } catch {
      this.reportNotificationFailure(subscription);
    }
  }

  private reportNotificationFailure(subscription: CoachingSubscription): void {
    this.options.incidents.refundNotificationFailed({
      subscriptionId: subscription.id,
    });
  }
}

function redecide(
  decision: RecordedCancellation,
  reread: { fresh: CoachingSubscription; cancelledAt: Date },
): RecordedCancellation | null {
  const retried = reread.fresh.cancel(reread.cancelledAt);

  if (retried.outcome === "cancelled") {
    return retried;
  }

  const refund = decision.subscription.refund;

  if (!refund) {
    return null;
  }

  const recording = reread.fresh.recordWithdrawalRefund({
    refund,
    cancelledAt: reread.cancelledAt,
  });

  return recording.outcome === "recorded"
    ? { ...decision, subscription: recording.subscription }
    : null;
}
