import type { AcquisitionIncidents } from "@eli-coach-platform/domain/acquisition";
import type { AssessmentCallIncidents } from "@eli-coach-platform/domain/assessment-call";
import type { ClientInvitationIncidents } from "@eli-coach-platform/domain/client-invitation";
import type { ClientOnboardingIncidents } from "@eli-coach-platform/domain/client-onboarding";
import type { MeasurementIncidents } from "@eli-coach-platform/domain/client-profile";
import type { ClientRosterIncidents } from "@eli-coach-platform/domain/client-roster";
import type { CoachingSubscriptionIncidents } from "@eli-coach-platform/domain/coaching-subscription";
import type { CoachingSalesIncidents } from "@eli-coach-platform/domain/payment-link";
import type { WaitlistIncidents } from "@eli-coach-platform/domain/waitlist";
import type { PaymentWebhookIncidents } from "@eli-coach-platform/infrastructure/payments/server";

type ConsoleLogger = AcquisitionIncidents &
  AssessmentCallIncidents &
  ClientInvitationIncidents &
  ClientOnboardingIncidents &
  ClientRosterIncidents &
  CoachingSalesIncidents &
  CoachingSubscriptionIncidents &
  MeasurementIncidents &
  PaymentWebhookIncidents &
  WaitlistIncidents;

export function createConsoleLogger(): ConsoleLogger {
  return {
    bookingModeReadFailed: () => {
      console.error("Assessment call booking mode read failed.", {
        errorCategory: "assessment_call_booking_mode_read_failure",
      });
    },
    callsReadFailed: () => {
      console.error("Assessment calls could not be read.", {
        errorCategory: "assessment_call_listing_failure",
      });
    },
    cardMirrorFailed: ({ error, paymentCustomerId }) => {
      console.error(
        "Card on file could not be mirrored; Stripe will redeliver.",
        {
          errorCategory: "payment_card_mirror_failure",
          errorClass: errorClassOf(error),
          paymentCustomerId,
        },
      );
    },
    confirmationDeliveryFailed: () => {
      console.error("Waitlist confirmation email failed.", {
        errorCategory: "waitlist_confirmation_failure",
      });
    },
    deliveryAcceptanceAuditPending: ({ requestId }) => {
      console.error(
        "Store delivery acceptance audit requires reconciliation.",
        {
          errorCategory: "store_delivery_acceptance_audit_pending",
          requestId,
        },
      );
    },
    deliveryRejected: ({ reason, requestId }) => {
      console.error("Store delivery provider rejected the request.", {
        errorCategory: "store_delivery_rejected",
        providerRejectionReason: reason,
        requestId,
      });
    },
    invitationEmailFailed: ({ invitationId }) => {
      console.error("Client invitation email failed.", {
        errorCategory: "client_invitation_email_failure",
        invitationId,
      });
    },
    invitationResendFailed: ({ invitationId, step }) => {
      console.error("Client invitation re-send failed.", {
        errorCategory: "client_invitation_resend_failure",
        invitationId,
        step,
      });
    },
    invitationResent: ({ invitationId }) => {
      console.info("Client invitation re-sent.", {
        eventCategory: "client_invitation_resent",
        invitationId,
      });
    },
    measurementEntrySaved: ({ clientId, entryId }) => {
      console.info("Measurement entry saved.", {
        clientId,
        entryId,
        eventCategory: "measurement_entry_saved",
      });
    },
    notificationFailed: ({ recipient }) => {
      console.error("Assessment call notification failed.", {
        errorCategory: "assessment_call_notification_failure",
        recipient,
      });
    },
    onboardingAnswersApproved: ({ clientId }) => {
      console.info("Client onboarding answers approved.", {
        clientId,
        eventCategory: "client_onboarding_answers_approved",
      });
    },
    onboardingDetailsAnswered: ({ clientId, questionCount }) => {
      console.info("Client onboarding details answered.", {
        clientId,
        eventCategory: "client_onboarding_details_answered",
        questionCount,
      });
    },
    onboardingDetailsRefused: ({ clientId, reason }) => {
      console.warn("Client onboarding details refused.", {
        clientId,
        eventCategory: "client_onboarding_details_refused",
        reason,
      });
    },
    onboardingDetailsRequestEmailFailed: ({ clientId, requestId }) => {
      console.error("Client onboarding details request email failed.", {
        clientId,
        errorCategory: "client_onboarding_details_request_email_failure",
        requestId,
      });
    },
    onboardingDetailsRequested: ({ clientId, questionCount }) => {
      console.info("Client onboarding details requested.", {
        clientId,
        eventCategory: "client_onboarding_details_requested",
        questionCount,
      });
    },
    onboardingDraftSaved: ({ clientId, formId }) => {
      console.info("Client onboarding draft saved.", {
        clientId,
        eventCategory: "client_onboarding_draft_saved",
        formId,
      });
    },
    onboardingDraftSaveFailed: ({ clientId, formId }) => {
      console.error("Client onboarding draft save failed.", {
        clientId,
        errorCategory: "client_onboarding_draft_save_failure",
        formId,
      });
    },
    onboardingReviewOpened: ({ clientId }) => {
      console.info("Client onboarding review opened.", {
        clientId,
        eventCategory: "client_onboarding_review_opened",
      });
    },
    onboardingReviewStampsRepaired: ({ clientId }) => {
      console.warn("Client onboarding review stamps repaired.", {
        clientId,
        eventCategory: "client_onboarding_review_stamps_repaired",
      });
    },
    onboardingSubmissionAccepted: ({ clientId, screeningOutcome }) => {
      console.info("Client onboarding submission accepted.", {
        clientId,
        eventCategory: "client_onboarding_submission_accepted",
        screeningOutcome,
      });
    },
    onboardingSubmissionRefused: ({ clientId, reason }) => {
      console.warn("Client onboarding submission refused.", {
        clientId,
        eventCategory: "client_onboarding_submission_refused",
        reason,
      });
    },
    paymentCardEventMirrored: ({
      eventId,
      eventKind,
      outcome,
      paymentCustomerId,
    }) => {
      console.info("Card on file mirrored.", {
        eventCategory: "payment_card_event_mirrored",
        eventId,
        eventKind,
        outcome,
        paymentCustomerId,
      });
    },
    paymentEventHandlingFailed: ({ errorClass, eventId, handler }) => {
      console.error("Payment event handler failed; Stripe will redeliver.", {
        errorCategory: "payment_event_handling_failure",
        errorClass,
        eventId,
        handler,
      });
    },
    paymentEventRejected: ({ eventId, reason }) => {
      console.error("Payment event was not recorded.", {
        errorCategory: "payment_event_rejected",
        eventId,
        reason,
      });
    },
    paymentEventUnrouted: ({ eventId, purpose }) => {
      console.error("Payment event matched no payment handler.", {
        errorCategory: "payment_event_unrouted",
        eventId,
        purpose,
      });
    },
    paymentLinkEmailFailed: (assessmentCallId) => {
      console.error("Payment link email failed.", {
        assessmentCallId,
        errorCategory: "payment_link_email_failure",
      });
    },
    paymentMethodSessionOpened: ({ subscriptionId }) => {
      console.info("Payment method session opened.", {
        eventCategory: "payment_method_session_opened",
        subscriptionId,
      });
    },
    programStartedNow: ({ subscriptionId }) => {
      console.info("Coaching program started now.", {
        eventCategory: "coaching_program_started_now",
        subscriptionId,
      });
    },
    progressPhotoAccessRefused: ({ photoId, requesterRole }) => {
      console.warn("Progress photo access refused.", {
        eventCategory: "progress_photo_access_refused",
        photoId,
        requesterRole,
      });
    },
    progressPhotoDeleted: ({ clientId, entryId, photoId, view }) => {
      console.info("Progress photo deleted.", {
        clientId,
        entryId,
        eventCategory: "progress_photo_deleted",
        photoId,
        view,
      });
    },
    progressPhotoRefused: ({
      clientId,
      entryId,
      reason,
      receivedBytes,
      view,
    }) => {
      console.warn("Progress photo refused.", {
        clientId,
        entryId,
        eventCategory: "progress_photo_refused",
        reason,
        receivedBytes,
        view,
      });
    },
    progressPhotoStored: ({
      clientId,
      entryId,
      receivedBytes,
      storedBytes,
      view,
    }) => {
      console.info("Progress photo stored.", {
        clientId,
        entryId,
        eventCategory: "progress_photo_stored",
        receivedBytes,
        storedBytes,
        view,
      });
    },
    refundNotificationFailed: ({ subscriptionId }) => {
      console.error("Refund due email to the coach failed.", {
        errorCategory: "coaching_subscription_refund_notification_failure",
        subscriptionId,
      });
    },
    refundSettled: ({ refundedCents, subscriptionId }) => {
      console.info("Coaching subscription refund settled.", {
        eventCategory: "coaching_subscription_refund_settled",
        refundedCents,
        subscriptionId,
      });
    },
    renewalHoldApplied: ({ paymentSubscriptionId }) => {
      console.info("Coaching subscription renewal hold applied.", {
        eventCategory: "coaching_subscription_renewal_hold_applied",
        paymentSubscriptionId,
      });
    },
    renewalHoldFailed: ({ error, paymentSubscriptionId }) => {
      console.error(
        "Coaching subscription renewal hold failed; Stripe will redeliver.",
        {
          errorCategory: "coaching_subscription_renewal_hold_failure",
          errorClass: errorClassOf(error),
          paymentSubscriptionId,
        },
      );
    },
    retryableDeliveryAuditPending: ({ requestId }) => {
      console.error("Store retryable delivery audit requires reconciliation.", {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId,
      });
    },
    rosterReadFailed: (error) => {
      console.error("Client roster could not be read.", {
        errorCategory: "client_roster_read_failure",
        errorClass: errorClassOf(error),
      });
    },
    salesModeReadFailed: (error) => {
      console.error("Coaching sales mode feature flag read failed.", {
        errorCategory: "coaching_sales_mode_read_failure",
        ...describeError(error),
      });
    },
    slotsReadFailed: () => {
      console.error("Assessment call slots could not be read.", {
        errorCategory: "assessment_call_slots_failure",
      });
    },
    subscriptionCancellationFailed: ({ error, rule, subscriptionId }) => {
      console.error(
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
      console.info("Coaching subscription cancelled.", {
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
      console.info("Coaching subscription event reconciled.", {
        eventCategory: "coaching_subscription_event_reconciled",
        eventId,
        eventKind,
        outcome,
        paymentReference,
      });
    },
    waitlistModeReadFailed: () => {
      console.error("Waitlist mode feature flag read failed.", {
        errorCategory: "waitlist_mode_read_failure",
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

function errorClassOf(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}
