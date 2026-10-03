import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import type { SubscriptionEvent } from "./subscription-event";

type ReconcileSubscriptionEventCommand = {
  eventId: string;
  event: SubscriptionEvent;
};

type ReconcileSubscriptionEventResult = {
  status: "recorded" | "duplicate" | "ignored";
};

type ReconcileSubscriptionEventUseCaseOptions = {
  incidents: CoachingSubscriptionIncidents;
  subscriptions: CoachingSubscriptions;
};

export class ReconcileSubscriptionEventUseCase {
  constructor(
    private readonly options: ReconcileSubscriptionEventUseCaseOptions,
  ) {}

  async execute(
    command: ReconcileSubscriptionEventCommand,
  ): Promise<ReconcileSubscriptionEventResult> {
    const first = await this.attempt(command);
    const result = first === "stale" ? await this.attempt(command) : first;

    if (result === "stale") {
      throw new Error(
        `Payment event ${command.eventId} met a coaching subscription that kept changing.`,
      );
    }

    return result;
  }

  private async attempt(
    command: ReconcileSubscriptionEventCommand,
  ): Promise<ReconcileSubscriptionEventResult | "stale"> {
    const { event, eventId } = command;
    const current = await this.subscriptionFor(event);
    const incident = {
      eventId,
      eventKind: event.kind,
      paymentReference: paymentReferenceOf(event),
    };

    if (!current) {
      this.options.incidents.subscriptionEventReconciled({
        ...incident,
        outcome: "unknown-subscription",
      });

      return { status: "ignored" };
    }

    const mirrored = mirror(current, event);
    const saved = await this.options.subscriptions.saveForEvent({
      eventId,
      subscription: mirrored,
      previous: current,
    });

    if (saved === "stale") {
      return "stale";
    }

    this.options.incidents.subscriptionEventReconciled({
      ...incident,
      outcome: saved,
    });

    if (saved === "recorded") {
      this.reportSettledRefund(current, mirrored);
    }

    return { status: saved };
  }

  private subscriptionFor(
    event: SubscriptionEvent,
  ): Promise<CoachingSubscription | null> {
    if (event.kind === "charge-refunded") {
      return this.options.subscriptions.findCurrentByPaymentCustomerId(
        event.paymentCustomerId,
      );
    }

    return this.options.subscriptions.findByPaymentSubscriptionId(
      event.paymentSubscriptionId,
    );
  }

  private reportSettledRefund(
    previous: CoachingSubscription,
    mirrored: CoachingSubscription,
  ): void {
    const refund = mirrored.refund;

    if (!refund?.isSettled() || previous.refund?.isSettled()) {
      return;
    }

    this.options.incidents.refundSettled({
      subscriptionId: mirrored.id,
      refundedCents: refund.refundedCents,
    });
  }
}

function paymentReferenceOf(event: SubscriptionEvent): string {
  return event.kind === "charge-refunded"
    ? event.paymentCustomerId
    : event.paymentSubscriptionId;
}

function mirror(
  subscription: CoachingSubscription,
  event: SubscriptionEvent,
): CoachingSubscription {
  switch (event.kind) {
    case "end-scheduled":
      return subscription.scheduleEnd({
        endsAt: event.endsAt,
        at: event.occurredAt,
      });
    case "end-lifted":
      return subscription.liftScheduledEnd();
    case "ended":
      return subscription.end(event.endedAt);
    case "payment-problem":
      return subscription.flagPaymentProblem(event.occurredAt);
    case "payment-recovered":
    case "renewal-paid":
      return subscription.clearPaymentProblem();
    case "charge-refunded":
      return subscription.settleRefund({
        refundedCents: event.refundedCents,
        at: event.occurredAt,
      });
  }
}
