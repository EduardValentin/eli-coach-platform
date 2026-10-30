import type { CoachingEndHandlerPort } from "./coaching-end-handler-port";
import { CoachingEndPropagation } from "./coaching-end-propagation";
import type { CoachingPeriodHandlerPort } from "./coaching-period-handler-port";
import { CoachingPeriodPropagation } from "./coaching-period-propagation";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";
import type { SubscriptionEvent } from "./subscription-event";

type ReconcileSubscriptionEventCommand = {
  eventId: string;
  event: SubscriptionEvent;
};

type ReconcileSubscriptionEventResult = {
  status: "recorded" | "duplicate" | "ignored";
};

type ReconcileSubscriptionEventUseCaseOptions = {
  coachingEnds: readonly CoachingEndHandlerPort[];
  coachingPeriods: readonly CoachingPeriodHandlerPort[];
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
  coachingSubscriptionsPort: CoachingSubscriptionsPort;
};

export class ReconcileSubscriptionEventUseCase {
  private readonly coachingEnd: CoachingEndPropagation;
  private readonly coachingPeriod: CoachingPeriodPropagation;

  constructor(
    private readonly options: ReconcileSubscriptionEventUseCaseOptions,
  ) {
    this.coachingEnd = new CoachingEndPropagation(options);
    this.coachingPeriod = new CoachingPeriodPropagation(options);
  }

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
      this.options.coachingSubscriptionIncidentsPort.subscriptionEventReconciled(
        {
          ...incident,
          outcome: "unknown-subscription",
        },
      );

      return { status: "ignored" };
    }

    const mirrored = mirror(current, event);
    const saved = await this.options.coachingSubscriptionsPort.saveForEvent({
      eventId,
      subscription: mirrored,
      previous: current,
    });

    if (saved === "stale") {
      return "stale";
    }

    this.options.coachingSubscriptionIncidentsPort.subscriptionEventReconciled({
      ...incident,
      outcome: saved,
    });

    if (saved === "recorded") {
      this.reportSettledRefund(current, mirrored);
      await this.coachingEnd.propagate(mirrored);
    }

    if (saved === "recorded" && event.kind === "renewal-paid") {
      await this.coachingPeriod.propagatePaidThrough(mirrored);
    }

    return { status: saved };
  }

  private subscriptionFor(
    event: SubscriptionEvent,
  ): Promise<CoachingSubscription | null> {
    if (event.kind === "charge-refunded") {
      return this.options.coachingSubscriptionsPort.findByPaymentIntentId(
        event.paymentIntentId,
      );
    }

    return this.options.coachingSubscriptionsPort.findByPaymentSubscriptionId(
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

    this.options.coachingSubscriptionIncidentsPort.refundSettled({
      subscriptionId: mirrored.id,
      refundedCents: refund.refundedCents,
    });
  }
}

function paymentReferenceOf(event: SubscriptionEvent): string {
  return event.kind === "charge-refunded"
    ? event.paymentIntentId
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
      return subscription.clearPaymentProblem();
    case "renewal-paid":
      return subscription.renewalPaid(event.paidThrough);
    case "charge-refunded":
      return subscription.settleRefund({
        refundedCents: event.refundedCents,
        at: event.occurredAt,
      });
  }
}
