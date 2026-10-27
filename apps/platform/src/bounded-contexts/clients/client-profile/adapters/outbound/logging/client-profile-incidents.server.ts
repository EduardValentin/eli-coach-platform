import type {
  ClientAvatarIncidents,
  MeasurementIncidents,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ClientOnboardingIncidents } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { Logger } from "~/shared/logging/console-logger.server";

export function createClientProfileIncidents(
  logger: Logger,
): ClientAvatarIncidents & MeasurementIncidents & ClientOnboardingIncidents {
  return {
    clientAvatarFileOrphaned: ({ clientId, storageKey }) => {
      logger.error("Client avatar file could not be deleted.", {
        clientId,
        errorCategory: "client_avatar_file_orphaned",
        storageKey,
      });
    },
    measurementEntrySaved: ({ clientId, entryId }) => {
      logger.info("Measurement entry saved.", {
        clientId,
        entryId,
        eventCategory: "measurement_entry_saved",
      });
    },
    onboardingAnswersApproved: ({ clientId }) => {
      logger.info("Client onboarding answers approved.", {
        clientId,
        eventCategory: "client_onboarding_answers_approved",
      });
    },
    onboardingDetailsAnswered: ({ clientId, questionCount }) => {
      logger.info("Client onboarding details answered.", {
        clientId,
        eventCategory: "client_onboarding_details_answered",
        questionCount,
      });
    },
    onboardingDetailsRefused: ({ clientId, reason }) => {
      logger.warn("Client onboarding details refused.", {
        clientId,
        eventCategory: "client_onboarding_details_refused",
        reason,
      });
    },
    onboardingDetailsRequestEmailFailed: ({ clientId, requestId }) => {
      logger.error("Client onboarding details request email failed.", {
        clientId,
        errorCategory: "client_onboarding_details_request_email_failure",
        requestId,
      });
    },
    onboardingDetailsRequested: ({ clientId, questionCount }) => {
      logger.info("Client onboarding details requested.", {
        clientId,
        eventCategory: "client_onboarding_details_requested",
        questionCount,
      });
    },
    onboardingDraftSaved: ({ clientId, formId }) => {
      logger.info("Client onboarding draft saved.", {
        clientId,
        eventCategory: "client_onboarding_draft_saved",
        formId,
      });
    },
    onboardingDraftSaveFailed: ({ clientId, formId }) => {
      logger.error("Client onboarding draft save failed.", {
        clientId,
        errorCategory: "client_onboarding_draft_save_failure",
        formId,
      });
    },
    onboardingReviewOpened: ({ clientId }) => {
      logger.info("Client onboarding review opened.", {
        clientId,
        eventCategory: "client_onboarding_review_opened",
      });
    },
    onboardingReviewStampsRepaired: ({ clientId }) => {
      logger.warn("Client onboarding review stamps repaired.", {
        clientId,
        eventCategory: "client_onboarding_review_stamps_repaired",
      });
    },
    onboardingSubmissionAccepted: ({ clientId, screeningOutcome }) => {
      logger.info("Client onboarding submission accepted.", {
        clientId,
        eventCategory: "client_onboarding_submission_accepted",
        screeningOutcome,
      });
    },
    onboardingSubmissionRefused: ({ clientId, reason }) => {
      logger.warn("Client onboarding submission refused.", {
        clientId,
        eventCategory: "client_onboarding_submission_refused",
        reason,
      });
    },
    progressPhotoAccessRefused: ({ photoId, requesterRole }) => {
      logger.warn("Progress photo access refused.", {
        eventCategory: "progress_photo_access_refused",
        photoId,
        requesterRole,
      });
    },
    progressPhotoDeleted: ({ clientId, entryId, photoId, view }) => {
      logger.info("Progress photo deleted.", {
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
      logger.warn("Progress photo refused.", {
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
      logger.info("Progress photo stored.", {
        clientId,
        entryId,
        eventCategory: "progress_photo_stored",
        receivedBytes,
        storedBytes,
        view,
      });
    },
  };
}
