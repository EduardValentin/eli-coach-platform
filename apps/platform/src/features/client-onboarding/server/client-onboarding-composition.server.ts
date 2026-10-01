import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  AnswerOnboardingDetailsUseCase,
  ApproveOnboardingAnswersUseCase,
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
import type { ClientMeasurementsSource } from "@eli-coach-platform/domain/measurement";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ClientUnitPreferencesSource } from "@eli-coach-platform/domain/unit-preference";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { ClientOnboardingController } from "~/features/client-onboarding/api/client/client-onboarding-controller.server";
import { OnboardingReviewController } from "~/features/client-onboarding/api/coach/onboarding-review-controller.server";
import type {
  ClientProfileWriter,
  MeasurementEntryWriter,
} from "~/features/client-onboarding/data/client-profile-writers.server";
import { PostgresClientOnboardings } from "~/features/client-onboarding/data/onboardings/client-onboardings-repository.server";
import { RandomDetailRequestIds } from "~/features/client-onboarding/data/reviews/detail-request-ids.server";
import {
  PostgresOnboardingReviews,
  type ReviewStampWriter,
} from "~/features/client-onboarding/data/reviews/onboarding-reviews-repository.server";
import { EmailOnboardingDetailsNotifications } from "~/features/client-onboarding/email/email-onboarding-details-notifications.server";

export type ClientOnboardingFeature = {
  controller: ClientOnboardingController;
  coachReview: OnboardingReviewController;
};

type ClientOnboardingFeatureHandles = {
  appBasePath: string;
  attachProgressPhotos: AttachProgressPhotosUseCase;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  incidents: ClientOnboardingIncidents;
  measurements: ClientMeasurementsSource;
  onboardingClients: OnboardingClients;
  onboardingReviewStamps: OnboardingReviewStamps;
  onboardingSubmissionStamps: OnboardingSubmissionStamps;
  productEmail: ProductEmail;
  publicAppUrl: string;
  recordMeasurementEntry: MeasurementEntryWriter;
  reviewStampWriter: ReviewStampWriter;
  saveClientProfile: ClientProfileWriter;
  unitPreferences: ClientUnitPreferencesSource;
};

export function composeClientOnboardingFeature(
  handles: ClientOnboardingFeatureHandles,
): ClientOnboardingFeature {
  const {
    clock,
    incidents,
    onboardingClients: clients,
    unitPreferences,
  } = handles;
  const onboardings = new PostgresClientOnboardings({
    database: handles.database,
    clientProfileWriter: handles.saveClientProfile,
    measurementEntryWriter: handles.recordMeasurementEntry,
  });
  const reviews = new PostgresOnboardingReviews({
    database: handles.database,
    reviewStampWriter: handles.reviewStampWriter,
    clientProfileWriter: handles.saveClientProfile,
  });
  const reviewPorts = { clients, onboardings, reviews, incidents };
  const reviewReadPorts = {
    ...reviewPorts,
    stamps: handles.onboardingReviewStamps,
  };

  return {
    controller: new ClientOnboardingController({
      answerOnboardingDetails: new AnswerOnboardingDetailsUseCase({
        ...reviewPorts,
        clock,
        unitPreferences,
      }),
      attachProgressPhotos: handles.attachProgressPhotos,
      clock,
      readClientOnboarding: new ReadClientOnboardingUseCase({
        clients,
        onboardings,
        unitPreferences,
      }),
      readOpenDetailRequest: new ReadOpenDetailRequestUseCase(reviewReadPorts),
      saveOnboardingDraft: new SaveOnboardingDraftUseCase({
        changes: onboardings,
        clients,
        clock,
        incidents,
        onboardings,
      }),
      submitOnboarding: new SubmitOnboardingUseCase({
        changes: onboardings,
        clients,
        clock,
        incidents,
        onboardings,
        stamps: handles.onboardingSubmissionStamps,
        unitPreferences,
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
        requestIds: new RandomDetailRequestIds(),
      }),
    }),
  };
}
