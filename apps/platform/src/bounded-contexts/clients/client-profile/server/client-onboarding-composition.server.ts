import type { DatabaseClient } from "~/shared/database";
import type { ClientIdentities } from "@eli-coach-platform/domain/client";
import {
  AnswerOnboardingDetailsUseCase,
  ApproveOnboardingAnswersUseCase,
  OnboardingParticipants,
  OpenOnboardingReviewUseCase,
  ReadClientOnboardingUseCase,
  ReadOnboardingReviewUseCase,
  ReadOpenDetailRequestUseCase,
  RequestOnboardingDetailsUseCase,
  SaveOnboardingDraftUseCase,
  SubmitOnboardingUseCase,
  type ClientOnboardingIncidents,
  type OnboardingClients,
  type OnboardingReviewStamps,
  type OnboardingSubmissionStamps,
} from "@eli-coach-platform/domain/client-onboarding";
import type { AttachProgressPhotosUseCase } from "@eli-coach-platform/domain/client-profile";
import type {
  ClientMeasurementsSource,
  MeasurementIds,
} from "@eli-coach-platform/domain/measurement";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ClientSettingsSource } from "@eli-coach-platform/domain/client-settings";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { ClientOnboardingController } from "~/bounded-contexts/clients/client-profile/api/onboarding/client-onboarding-controller.server";
import { OnboardingReviewController } from "~/bounded-contexts/clients/client-profile/api/onboarding/onboarding-review-controller.server";
import type {
  CoachingSeedWriter,
  MeasurementEntryWriter,
  PhotoConsentWriter,
} from "~/bounded-contexts/clients/client-profile/data/onboarding/client-profile-writers.server";
import { PostgresClientOnboardings } from "~/bounded-contexts/clients/client-profile/data/onboarding/onboardings/client-onboardings-repository.server";
import { RandomDetailRequestIds } from "~/bounded-contexts/clients/client-profile/data/onboarding/reviews/random-detail-request-ids.server";
import {
  PostgresOnboardingReviews,
  type ReviewStampWriter,
} from "~/bounded-contexts/clients/client-profile/data/onboarding/reviews/onboarding-reviews-repository.server";
import { EmailOnboardingDetailsNotifications } from "~/bounded-contexts/clients/client-profile/email/onboarding/email-onboarding-details-notifications.server";

export type ClientOnboardingFeature = {
  controller: ClientOnboardingController;
  coachReview: OnboardingReviewController;
};

type ClientOnboardingFeatureHandles = {
  appBasePath: string;
  attachProgressPhotos: AttachProgressPhotosUseCase;
  clientIdentities: ClientIdentities;
  clientSettings: ClientSettingsSource;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  incidents: ClientOnboardingIncidents;
  measurementIds: MeasurementIds;
  measurements: ClientMeasurementsSource;
  onboardingClients: OnboardingClients;
  onboardingReviewStamps: OnboardingReviewStamps;
  onboardingSubmissionStamps: OnboardingSubmissionStamps;
  productEmail: ProductEmail;
  publicAppUrl: string;
  recordMeasurementEntry: MeasurementEntryWriter;
  recordPhotoConsent: PhotoConsentWriter;
  reviewStampWriter: ReviewStampWriter;
  seedCoaching: CoachingSeedWriter;
};

export function composeClientOnboardingFeature(
  handles: ClientOnboardingFeatureHandles,
): ClientOnboardingFeature {
  const { clock, incidents } = handles;
  const participants = new OnboardingParticipants({
    clients: handles.onboardingClients,
    identities: handles.clientIdentities,
  });
  const onboardings = new PostgresClientOnboardings({
    database: handles.database,
    measurementEntryWriter: handles.recordMeasurementEntry,
    photoConsentWriter: handles.recordPhotoConsent,
  });
  const reviews = new PostgresOnboardingReviews({
    database: handles.database,
    reviewStampWriter: handles.reviewStampWriter,
    coachingSeedWriter: handles.seedCoaching,
  });
  const reviewPorts = { participants, onboardings, reviews, incidents };
  const reviewReadPorts = {
    ...reviewPorts,
    stamps: handles.onboardingReviewStamps,
  };

  return {
    controller: new ClientOnboardingController({
      answerOnboardingDetails: new AnswerOnboardingDetailsUseCase({
        ...reviewPorts,
        clock,
        settings: handles.clientSettings,
      }),
      attachProgressPhotos: handles.attachProgressPhotos,
      clock,
      readClientOnboarding: new ReadClientOnboardingUseCase({
        participants,
        onboardings,
        settings: handles.clientSettings,
      }),
      readOpenDetailRequest: new ReadOpenDetailRequestUseCase(reviewReadPorts),
      saveOnboardingDraft: new SaveOnboardingDraftUseCase({
        changes: onboardings,
        clock,
        incidents,
        onboardings,
        participants,
      }),
      submitOnboarding: new SubmitOnboardingUseCase({
        changes: onboardings,
        clock,
        incidents,
        measurementIds: handles.measurementIds,
        onboardings,
        participants,
        stamps: handles.onboardingSubmissionStamps,
        settings: handles.clientSettings,
      }),
    }),
    coachReview: new OnboardingReviewController({
      approveOnboardingAnswers: new ApproveOnboardingAnswersUseCase({
        ...reviewPorts,
        clock,
      }),
      openOnboardingReview: new OpenOnboardingReviewUseCase({
        ...reviewPorts,
        clock,
      }),
      readOnboardingReview: new ReadOnboardingReviewUseCase({
        ...reviewReadPorts,
        measurements: handles.measurements,
      }),
      requestOnboardingDetails: new RequestOnboardingDetailsUseCase({
        ...reviewPorts,
        clock,
        notifications: new EmailOnboardingDetailsNotifications(
          handles.productEmail,
          {
            appBasePath: handles.appBasePath,
            clock,
            contactEmail: handles.contactEmail,
            publicAppUrl: handles.publicAppUrl,
          },
        ),
        ids: new RandomDetailRequestIds(),
      }),
    }),
  };
}
