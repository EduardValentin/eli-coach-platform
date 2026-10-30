import type {
  ClientAvatarIncidentsPort,
  MeasurementIncidentsPort,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ClientOnboardingIncidentsPort } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { LoggerPort } from "~/shared/logging/logger-port.server";

export class ClientProfileIncidentsAdapter
  implements
    ClientAvatarIncidentsPort,
    MeasurementIncidentsPort,
    ClientOnboardingIncidentsPort
{
  constructor(private readonly logger: LoggerPort) {}

  clientAvatarFileOrphaned({
    clientId,
    storageKey,
  }: Parameters<ClientAvatarIncidentsPort["clientAvatarFileOrphaned"]>[0]) {
    this.logger.error("Client avatar file could not be deleted.", {
      clientId,
      errorCategory: "client_avatar_file_orphaned",
      storageKey,
    });
  }

  measurementEntrySaved({
    clientId,
    entryId,
  }: Parameters<MeasurementIncidentsPort["measurementEntrySaved"]>[0]) {
    this.logger.info("Measurement entry saved.", {
      clientId,
      entryId,
      eventCategory: "measurement_entry_saved",
    });
  }

  onboardingAnswersApproved({
    clientId,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingAnswersApproved"]
  >[0]) {
    this.logger.info("Client onboarding answers approved.", {
      clientId,
      eventCategory: "client_onboarding_answers_approved",
    });
  }

  onboardingDetailsAnswered({
    clientId,
    questionCount,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingDetailsAnswered"]
  >[0]) {
    this.logger.info("Client onboarding details answered.", {
      clientId,
      eventCategory: "client_onboarding_details_answered",
      questionCount,
    });
  }

  onboardingDetailsRefused({
    clientId,
    reason,
  }: Parameters<ClientOnboardingIncidentsPort["onboardingDetailsRefused"]>[0]) {
    this.logger.warn("Client onboarding details refused.", {
      clientId,
      eventCategory: "client_onboarding_details_refused",
      reason,
    });
  }

  onboardingDetailsRequestEmailFailed({
    clientId,
    requestId,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingDetailsRequestEmailFailed"]
  >[0]) {
    this.logger.error("Client onboarding details request email failed.", {
      clientId,
      errorCategory: "client_onboarding_details_request_email_failure",
      requestId,
    });
  }

  onboardingDetailsRequested({
    clientId,
    questionCount,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingDetailsRequested"]
  >[0]) {
    this.logger.info("Client onboarding details requested.", {
      clientId,
      eventCategory: "client_onboarding_details_requested",
      questionCount,
    });
  }

  onboardingDraftSaved({
    clientId,
    formId,
  }: Parameters<ClientOnboardingIncidentsPort["onboardingDraftSaved"]>[0]) {
    this.logger.info("Client onboarding draft saved.", {
      clientId,
      eventCategory: "client_onboarding_draft_saved",
      formId,
    });
  }

  onboardingDraftSaveFailed({
    clientId,
    formId,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingDraftSaveFailed"]
  >[0]) {
    this.logger.error("Client onboarding draft save failed.", {
      clientId,
      errorCategory: "client_onboarding_draft_save_failure",
      formId,
    });
  }

  onboardingReviewOpened({
    clientId,
  }: Parameters<ClientOnboardingIncidentsPort["onboardingReviewOpened"]>[0]) {
    this.logger.info("Client onboarding review opened.", {
      clientId,
      eventCategory: "client_onboarding_review_opened",
    });
  }

  onboardingReviewStampsRepaired({
    clientId,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingReviewStampsRepaired"]
  >[0]) {
    this.logger.warn("Client onboarding review stamps repaired.", {
      clientId,
      eventCategory: "client_onboarding_review_stamps_repaired",
    });
  }

  onboardingSubmissionAccepted({
    clientId,
    screeningOutcome,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingSubmissionAccepted"]
  >[0]) {
    this.logger.info("Client onboarding submission accepted.", {
      clientId,
      eventCategory: "client_onboarding_submission_accepted",
      screeningOutcome,
    });
  }

  onboardingSubmissionRefused({
    clientId,
    reason,
  }: Parameters<
    ClientOnboardingIncidentsPort["onboardingSubmissionRefused"]
  >[0]) {
    this.logger.warn("Client onboarding submission refused.", {
      clientId,
      eventCategory: "client_onboarding_submission_refused",
      reason,
    });
  }

  progressPhotoAccessRefused({
    photoId,
    requesterRole,
  }: Parameters<MeasurementIncidentsPort["progressPhotoAccessRefused"]>[0]) {
    this.logger.warn("Progress photo access refused.", {
      eventCategory: "progress_photo_access_refused",
      photoId,
      requesterRole,
    });
  }

  progressPhotoDeleted({
    clientId,
    entryId,
    photoId,
    view,
  }: Parameters<MeasurementIncidentsPort["progressPhotoDeleted"]>[0]) {
    this.logger.info("Progress photo deleted.", {
      clientId,
      entryId,
      eventCategory: "progress_photo_deleted",
      photoId,
      view,
    });
  }

  progressPhotoRefused({
    clientId,
    entryId,
    reason,
    receivedBytes,
    view,
  }: Parameters<MeasurementIncidentsPort["progressPhotoRefused"]>[0]) {
    this.logger.warn("Progress photo refused.", {
      clientId,
      entryId,
      eventCategory: "progress_photo_refused",
      reason,
      receivedBytes,
      view,
    });
  }

  progressPhotoStored({
    clientId,
    entryId,
    receivedBytes,
    storedBytes,
    view,
  }: Parameters<MeasurementIncidentsPort["progressPhotoStored"]>[0]) {
    this.logger.info("Progress photo stored.", {
      clientId,
      entryId,
      eventCategory: "progress_photo_stored",
      receivedBytes,
      storedBytes,
      view,
    });
  }
}
