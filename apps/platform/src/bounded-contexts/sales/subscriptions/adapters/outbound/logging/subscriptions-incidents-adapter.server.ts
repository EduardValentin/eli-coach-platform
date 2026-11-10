import type { SubscriptionsIncidentsPort } from "~/bounded-contexts/sales/subscriptions/domain/payment-link";
import type { CoachingSubscriptionIncidentsPort } from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { errorClassOf } from "~/shared/logging/error-fields.server";

export class SubscriptionsIncidentsAdapter
  implements SubscriptionsIncidentsPort, CoachingSubscriptionIncidentsPort
{
  constructor(private readonly loggerPort: LoggerPort) {}

  coachingEndNotPropagated({
    clientId,
    endsAt,
    error,
    subscriptionId,
  }: {
    subscriptionId: string;
    clientId: string;
    endsAt: Date;
    error: unknown;
  }) {
    this.loggerPort.error(
      "Coaching end did not reach the client's check-ins; their later check-ins stay booked.",
      {
        clientId,
        endsAt: endsAt.toISOString(),
        errorCategory: "coaching_end_propagation_failure",
        errorClass: errorClassOf(error),
        subscriptionId,
      },
    );
  }

  coachingPeriodNotPropagated({
    clientId,
    error,
    subscriptionId,
  }: {
    subscriptionId: string;
    clientId: string;
    error: unknown;
  }) {
    this.loggerPort.error(
      "Coaching period did not reach the client's check-ins; her weekly check-in misses the new weeks.",
      {
        clientId,
        errorCategory: "coaching_period_propagation_failure",
        errorClass: errorClassOf(error),
        subscriptionId,
      },
    );
  }

  paymentCardRefreshFailed({
    error,
    paymentCustomerId,
  }: {
    paymentCustomerId: string;
    error: unknown;
  }) {
    this.loggerPort.error(
      "Payment card could not be refreshed; Stripe will redeliver.",
      {
        errorCategory: "payment_card_mirror_failure",
        errorClass: errorClassOf(error),
        paymentCustomerId,
      },
    );
  }

  paymentCardEventMirrored({
    eventId,
    eventKind,
    outcome,
    paymentCustomerId,
  }: Parameters<
    CoachingSubscriptionIncidentsPort["paymentCardEventMirrored"]
  >[0]) {
    this.loggerPort.info("Card on file mirrored.", {
      eventCategory: "payment_card_event_mirrored",
      eventId,
      eventKind,
      outcome,
      paymentCustomerId,
    });
  }

  paymentEventRejected({
    eventId,
    reason,
  }: Parameters<CoachingSubscriptionIncidentsPort["paymentEventRejected"]>[0]) {
    this.loggerPort.error("Payment event was not recorded.", {
      errorCategory: "payment_event_rejected",
      eventId,
      reason,
    });
  }

  paymentLinkEmailFailed(assessmentCallId: string) {
    this.loggerPort.error("Payment link email failed.", {
      assessmentCallId,
      errorCategory: "payment_link_email_failure",
    });
  }

  paymentMethodSessionOpened({ subscriptionId }: { subscriptionId: string }) {
    this.loggerPort.info("Payment method session opened.", {
      eventCategory: "payment_method_session_opened",
      subscriptionId,
    });
  }

  programStartedNow({ subscriptionId }: { subscriptionId: string }) {
    this.loggerPort.info("Coaching program started now.", {
      eventCategory: "coaching_program_started_now",
      subscriptionId,
    });
  }

  refundNotificationFailed({ subscriptionId }: { subscriptionId: string }) {
    this.loggerPort.error("Refund due email to the coach failed.", {
      errorCategory: "coaching_subscription_refund_notification_failure",
      subscriptionId,
    });
  }

  refundSettled({
    refundedCents,
    subscriptionId,
  }: {
    subscriptionId: string;
    refundedCents: number;
  }) {
    this.loggerPort.info("Coaching subscription refund settled.", {
      eventCategory: "coaching_subscription_refund_settled",
      refundedCents,
      subscriptionId,
    });
  }

  renewalHoldApplied({
    paymentSubscriptionId,
  }: {
    paymentSubscriptionId: string;
  }) {
    this.loggerPort.info("Coaching subscription renewal hold applied.", {
      eventCategory: "coaching_subscription_renewal_hold_applied",
      paymentSubscriptionId,
    });
  }

  renewalHoldFailed({
    error,
    paymentSubscriptionId,
  }: {
    paymentSubscriptionId: string;
    error: unknown;
  }) {
    this.loggerPort.error(
      "Coaching subscription renewal hold failed; Stripe will redeliver.",
      {
        errorCategory: "coaching_subscription_renewal_hold_failure",
        errorClass: errorClassOf(error),
        paymentSubscriptionId,
      },
    );
  }

  renewalHoldLiftFailed({
    error,
    paymentSubscriptionId,
  }: {
    paymentSubscriptionId: string;
    error: unknown;
  }) {
    this.loggerPort.error(
      "Coaching subscription renewal hold could not be lifted; it ends at its resume date.",
      {
        errorCategory: "coaching_subscription_renewal_hold_lift_failure",
        errorClass: errorClassOf(error),
        paymentSubscriptionId,
      },
    );
  }

  salesModeReadFailed(error: unknown) {
    this.loggerPort.error("Subscriptions mode feature flag read failed.", {
      errorCategory: "subscriptions_mode_read_failure",
      ...this.describeError(error),
    });
  }

  subscriptionCancellationFailed({
    error,
    rule,
    subscriptionId,
  }: Parameters<
    CoachingSubscriptionIncidentsPort["subscriptionCancellationFailed"]
  >[0]) {
    this.loggerPort.error(
      "Coaching subscription cancellation failed at the payment provider.",
      {
        errorCategory: "coaching_subscription_cancellation_failure",
        errorClass: errorClassOf(error),
        rule,
        subscriptionId,
      },
    );
  }

  subscriptionCancelled({
    refundDueCents,
    rule,
    startChoice,
    subscriptionId,
  }: Parameters<
    CoachingSubscriptionIncidentsPort["subscriptionCancelled"]
  >[0]) {
    this.loggerPort.info("Coaching subscription cancelled.", {
      eventCategory: "coaching_subscription_cancelled",
      refundDueCents,
      rule,
      startChoice,
      subscriptionId,
    });
  }

  subscriptionEventReconciled({
    eventId,
    eventKind,
    outcome,
    paymentReference,
  }: Parameters<
    CoachingSubscriptionIncidentsPort["subscriptionEventReconciled"]
  >[0]) {
    this.loggerPort.info("Coaching subscription event reconciled.", {
      eventCategory: "coaching_subscription_event_reconciled",
      eventId,
      eventKind,
      outcome,
      paymentReference,
    });
  }

  private describeError(
    error: unknown,
  ): { errorClass: string; errorMessage: string } | { errorClass: string } {
    return error instanceof Error
      ? { errorClass: error.name, errorMessage: error.message }
      : { errorClass: errorClassOf(error) };
  }
}
