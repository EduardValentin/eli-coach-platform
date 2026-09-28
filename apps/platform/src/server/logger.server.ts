import type { AcquisitionIncidents } from "@eli-coach-platform/domain/acquisition";
import type { AssessmentCallIncidents } from "@eli-coach-platform/domain/assessment-call";
import type { ClientInvitationIncidents } from "@eli-coach-platform/domain/client-invitation";
import type { ClientOnboardingIncidents } from "@eli-coach-platform/domain/client-onboarding";
import type { CoachingSalesIncidents } from "@eli-coach-platform/domain/payment-link";
import type { WaitlistIncidents } from "@eli-coach-platform/domain/waitlist";
import type { PaymentWebhookIncidents } from "@eli-coach-platform/infrastructure/payments/server";

type ConsoleLogger = AcquisitionIncidents &
  AssessmentCallIncidents &
  ClientInvitationIncidents &
  ClientOnboardingIncidents &
  CoachingSalesIncidents &
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
    paymentEventHandlingFailed: ({ errorClass, eventId, purpose }) => {
      console.error("Payment event handler failed; Stripe will redeliver.", {
        errorCategory: "payment_event_handling_failure",
        errorClass,
        eventId,
        purpose,
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
    retryableDeliveryAuditPending: ({ requestId }) => {
      console.error("Store retryable delivery audit requires reconciliation.", {
        errorCategory: "store_delivery_retryable_audit_pending",
        requestId,
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
    : { errorClass: typeof error };
}
