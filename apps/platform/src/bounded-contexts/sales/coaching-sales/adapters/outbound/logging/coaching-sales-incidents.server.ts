import type { CoachingSalesIncidents } from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { CoachingSubscriptionIncidents } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { PaymentWebhookIncidents } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-webhook-incidents.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { errorClassOf } from "~/shared/logging/error-fields.server";

export function createCoachingSalesIncidents(
  logger: Logger,
): CoachingSalesIncidents &
  CoachingSubscriptionIncidents &
  PaymentWebhookIncidents {
  return {
    coachingEndNotPropagated: ({ clientId, endsAt, error, subscriptionId }) => {
      logger.error(
        "Coaching end did not reach the client's check-ins; their later check-ins stay booked.",
        {
          clientId,
          endsAt: endsAt.toISOString(),
          errorCategory: "coaching_end_propagation_failure",
          errorClass: errorClassOf(error),
          subscriptionId,
        },
      );
    },
    coachingPeriodNotPropagated: ({ clientId, error, subscriptionId }) => {
      logger.error(
        "Coaching period did not reach the client's check-ins; her weekly check-in misses the new weeks.",
        {
          clientId,
          errorCategory: "coaching_period_propagation_failure",
          errorClass: errorClassOf(error),
          subscriptionId,
        },
      );
    },
    paymentCardRefreshFailed: ({ error, paymentCustomerId }) => {
      logger.error(
        "Payment card could not be refreshed; Stripe will redeliver.",
        {
          errorCategory: "payment_card_mirror_failure",
          errorClass: errorClassOf(error),
          paymentCustomerId,
        },
      );
    },
    paymentCardEventMirrored: ({
      eventId,
      eventKind,
      outcome,
      paymentCustomerId,
    }) => {
      logger.info("Card on file mirrored.", {
        eventCategory: "payment_card_event_mirrored",
        eventId,
        eventKind,
        outcome,
        paymentCustomerId,
      });
    },
    paymentEventHandlingFailed: ({ errorClass, eventId, handler }) => {
      logger.error("Payment event handler failed; Stripe will redeliver.", {
        errorCategory: "payment_event_handling_failure",
        errorClass,
        eventId,
        handler,
      });
    },
    paymentEventRejected: ({ eventId, reason }) => {
      logger.error("Payment event was not recorded.", {
        errorCategory: "payment_event_rejected",
        eventId,
        reason,
      });
    },
    paymentEventUnrouted: ({ eventId, purpose }) => {
      logger.error("Payment event matched no payment handler.", {
        errorCategory: "payment_event_unrouted",
        eventId,
        purpose,
      });
    },
    paymentLinkEmailFailed: (assessmentCallId) => {
      logger.error("Payment link email failed.", {
        assessmentCallId,
        errorCategory: "payment_link_email_failure",
      });
    },
    paymentMethodSessionOpened: ({ subscriptionId }) => {
      logger.info("Payment method session opened.", {
        eventCategory: "payment_method_session_opened",
        subscriptionId,
      });
    },
    programStartedNow: ({ subscriptionId }) => {
      logger.info("Coaching program started now.", {
        eventCategory: "coaching_program_started_now",
        subscriptionId,
      });
    },
    refundNotificationFailed: ({ subscriptionId }) => {
      logger.error("Refund due email to the coach failed.", {
        errorCategory: "coaching_subscription_refund_notification_failure",
        subscriptionId,
      });
    },
    refundSettled: ({ refundedCents, subscriptionId }) => {
      logger.info("Coaching subscription refund settled.", {
        eventCategory: "coaching_subscription_refund_settled",
        refundedCents,
        subscriptionId,
      });
    },
    renewalHoldApplied: ({ paymentSubscriptionId }) => {
      logger.info("Coaching subscription renewal hold applied.", {
        eventCategory: "coaching_subscription_renewal_hold_applied",
        paymentSubscriptionId,
      });
    },
    renewalHoldFailed: ({ error, paymentSubscriptionId }) => {
      logger.error(
        "Coaching subscription renewal hold failed; Stripe will redeliver.",
        {
          errorCategory: "coaching_subscription_renewal_hold_failure",
          errorClass: errorClassOf(error),
          paymentSubscriptionId,
        },
      );
    },
    renewalHoldLiftFailed: ({ error, paymentSubscriptionId }) => {
      logger.error(
        "Coaching subscription renewal hold could not be lifted; it ends at its resume date.",
        {
          errorCategory: "coaching_subscription_renewal_hold_lift_failure",
          errorClass: errorClassOf(error),
          paymentSubscriptionId,
        },
      );
    },
    salesModeReadFailed: (error) => {
      logger.error("Coaching sales mode feature flag read failed.", {
        errorCategory: "coaching_sales_mode_read_failure",
        ...describeError(error),
      });
    },
    subscriptionCancellationFailed: ({ error, rule, subscriptionId }) => {
      logger.error(
        "Coaching subscription cancellation failed at the payment provider.",
        {
          errorCategory: "coaching_subscription_cancellation_failure",
          errorClass: errorClassOf(error),
          rule,
          subscriptionId,
        },
      );
    },
    subscriptionCancelled: ({
      refundDueCents,
      rule,
      startChoice,
      subscriptionId,
    }) => {
      logger.info("Coaching subscription cancelled.", {
        eventCategory: "coaching_subscription_cancelled",
        refundDueCents,
        rule,
        startChoice,
        subscriptionId,
      });
    },
    subscriptionEventReconciled: ({
      eventId,
      eventKind,
      outcome,
      paymentReference,
    }) => {
      logger.info("Coaching subscription event reconciled.", {
        eventCategory: "coaching_subscription_event_reconciled",
        eventId,
        eventKind,
        outcome,
        paymentReference,
      });
    },
  };
}

function describeError(
  error: unknown,
): { errorClass: string; errorMessage: string } | { errorClass: string } {
  return error instanceof Error
    ? { errorClass: error.name, errorMessage: error.message }
    : { errorClass: errorClassOf(error) };
}
