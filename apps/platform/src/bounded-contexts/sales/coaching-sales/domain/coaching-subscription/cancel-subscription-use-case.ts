import type { ClientLookup } from "./client-lookup";
import type { Clock } from "../clock";

import type { CoachingEndHandler } from "./coaching-end-handler";
import { CoachingEndPropagation } from "./coaching-end-propagation";
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
import type {
  RefundDueNotice,
  RefundNotifications,
} from "./refund-notifications";
import type { SignedInSubscriptions } from "./signed-in-subscriptions";

type CancelSubscriptionResult =
  | {
      status: "cancelled";
      rule: Exclude<CancellationRule, "none">;
      subscription: CoachingSubscriptionSnapshot;
      refundDue: boolean;
    }
  | { status: "nothing_to_cancel" }
  | { status: "not_found" }
  | { status: "provider_unavailable" };

type RecordedCancellation = Extract<
  SubscriptionCancellation,
  { outcome: "cancelled" }
>;

type CancelSubscriptionUseCaseOptions = {
  clients: Pick<ClientLookup, "identityOf">;
  clock: Clock;
  coachingEnds: readonly CoachingEndHandler[];
  incidents: CoachingSubscriptionIncidents;
  notifications: RefundNotifications;
  paymentSubscriptions: PaymentSubscriptions;
  signedInSubscriptions: Pick<SignedInSubscriptions, "currentFor">;
  subscriptions: CoachingSubscriptions;
};

type CancellationRecording = {
  clientId: string;
  now: Date;
  previous: CoachingSubscription;
};

export class CancelSubscriptionUseCase {
  private readonly coachingEnd: CoachingEndPropagation;

  constructor(private readonly options: CancelSubscriptionUseCaseOptions) {
    this.coachingEnd = new CoachingEndPropagation(options);
  }

  async execute(authSubjectId: string): Promise<CancelSubscriptionResult> {
    const current =
      await this.options.signedInSubscriptions.currentFor(authSubjectId);

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
      clientId: current.clientId,
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
    await this.coachingEnd.propagate(recorded.subscription);
    await this.notifyCoach(recorded.subscription);

    return {
      status: "cancelled",
      rule: recorded.rule,
      subscription: recorded.subscription.toSnapshot(),
      refundDue: recorded.subscription.hasRefundOutstanding(),
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

    const fresh = await this.options.subscriptions.findCurrentForClient(
      recording.clientId,
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
    if (!subscription.refund || subscription.refund.amountCents === 0) {
      return;
    }

    try {
      const notice = await this.refundDueNoticeOf(subscription);

      if (!notice) {
        this.reportNotificationFailure(subscription);
        return;
      }

      const delivery = await this.options.notifications.notifyRefundDue(notice);

      if (delivery === "failed") {
        this.reportNotificationFailure(subscription);
      }
    } catch {
      this.reportNotificationFailure(subscription);
    }
  }

  private async refundDueNoticeOf(
    subscription: CoachingSubscription,
  ): Promise<RefundDueNotice | null> {
    const { refund, cancelledAt } = subscription;

    if (!refund || !cancelledAt) {
      return null;
    }

    const client = await this.options.clients.identityOf(subscription.clientId);

    if (!client) {
      return null;
    }

    return {
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
      cancelledAt,
      refund: refund.toSnapshot(),
    };
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

  if (decision.rule !== "full-refund") {
    return null;
  }

  const recording = reread.fresh.recordWithdrawalRefund(reread.cancelledAt);

  return recording.outcome === "recorded"
    ? { ...decision, subscription: recording.subscription }
    : null;
}
