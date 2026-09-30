import type { DatabaseClient } from "@eli-coach-platform/db";
import type { ClientIdentities } from "@eli-coach-platform/domain/client";
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
import { ReadClientProfileUseCase } from "@eli-coach-platform/domain/client-profile";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  SaveUnitPreferenceUseCase,
  type UnitPreferenceClients,
} from "@eli-coach-platform/domain/unit-preference";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { ClientOnboardingController } from "~/features/client-onboarding/api/client/client-onboarding-controller.server";
import { ClientProfileController } from "~/features/client-onboarding/api/coach/client-profile-controller.server";
import { OnboardingReviewController } from "~/features/client-onboarding/api/coach/onboarding-review-controller.server";
import { PostgresClientMeasurements } from "~/features/client-onboarding/data/measurements/client-measurements-reader.server";
import { PostgresClientOnboardings } from "~/features/client-onboarding/data/onboardings/client-onboardings-repository.server";
import { PostgresClientProfiles } from "~/features/client-onboarding/data/profiles/client-profiles-repository.server";
import { RandomDetailRequestIds } from "~/features/client-onboarding/data/reviews/detail-request-ids.server";
import {
  PostgresOnboardingReviews,
  type ReviewStampWriter,
} from "~/features/client-onboarding/data/reviews/onboarding-reviews-repository.server";
import { PostgresClientUnitPreferences } from "~/features/client-onboarding/data/unit-preferences/client-unit-preferences-repository.server";
import { EmailOnboardingDetailsNotifications } from "~/features/client-onboarding/email/email-onboarding-details-notifications.server";

export type ClientOnboardingFeature = {
  controller: ClientOnboardingController;
  coachReview: OnboardingReviewController;
  coachProfile: ClientProfileController;
};

type ClientOnboardingFeatureHandles = {
  appBasePath: string;
  clientIdentities: ClientIdentities;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  incidents: ClientOnboardingIncidents;
  onboardingClients: OnboardingClients & UnitPreferenceClients;
  onboardingReviewStamps: OnboardingReviewStamps;
  onboardingSubmissionStamps: OnboardingSubmissionStamps;
  productEmail: ProductEmail;
  publicAppUrl: string;
  reviewStampWriter: ReviewStampWriter;
};

export function composeClientOnboardingFeature(
  handles: ClientOnboardingFeatureHandles,
): ClientOnboardingFeature {
  const { clock, incidents, onboardingClients: clients } = handles;
  const onboardings = new PostgresClientOnboardings(handles.database);
  const unitPreferences = new PostgresClientUnitPreferences(handles.database);
  const reviews = new PostgresOnboardingReviews({
    database: handles.database,
    reviewStampWriter: handles.reviewStampWriter,
  });
  const measurements = new PostgresClientMeasurements(handles.database);
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
      saveUnitPreference: new SaveUnitPreferenceUseCase({
        clients,
        clock,
        preferences: unitPreferences,
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
        measurements,
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
    coachProfile: new ClientProfileController({
      readClientProfile: new ReadClientProfileUseCase({
        identities: handles.clientIdentities,
        measurements,
        profiles: new PostgresClientProfiles(handles.database),
      }),
    }),
  };
}
