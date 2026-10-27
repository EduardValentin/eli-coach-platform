import type { DatabaseClient } from "~/shared/database";
import type {
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import {
  AttachProgressPhotosUseCase,
  ListClientAvatarsUseCase,
  OpenClientAvatarUseCase,
  OpenProgressPhotoUseCase,
  ReadClientMeasurementHistoryUseCase,
  ReadClientProfileUseCase,
  ReadOwnClientAvatarUseCase,
  ReadOwnClientProfileUseCase,
  ReadOwnMeasurementHistoryUseCase,
  RecordMeasurementsUseCase,
  RemoveClientAvatarAsCoachUseCase,
  RemoveOwnClientAvatarUseCase,
  RemoveProgressPhotoUseCase,
  UpdateClientProfileAsCoachUseCase,
  UpdateOwnClientProfileUseCase,
  UploadClientAvatarAsCoachUseCase,
  UploadOwnClientAvatarUseCase,
  type ClientAvatarIncidents,
  type ClientAvatarRenditions,
  type ClientAvatarStore,
  type MeasurementIncidents,
  type ProgressPhotoRenditions,
  type ProgressPhotoStore,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import {
  ReadOwnClientSettingsUseCase,
  SaveUnitPreferenceUseCase,
  type ClientSettingsSource,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import type {
  ClientMeasurementsSource,
  MeasurementIds,
} from "~/bounded-contexts/clients/client-profile/domain/measurement";
import type { Clock } from "~/bounded-contexts/clients/client-profile/domain/clock";
import { ClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/avatar/client-avatar-controller.server";
import { ClientSettingsController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/client-settings-controller.server";
import { ClientMeasurementsController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/measurements-controller.server";
import { OwnClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/own-client-avatar-controller.server";
import { OwnClientProfileController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/own-client-profile-controller.server";
import { ClientProfileController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/coach/client-profile-controller.server";
import { CoachClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/coach/coach-client-avatar-controller.server";
import { ProgressPhotoController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/photos/progress-photo-controller.server";
import { PostgresClientAvatars } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/avatars/client-avatars-repository.server";
import { RandomClientAvatarIds } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/avatars/random-client-avatar-ids.server";
import { PostgresClientMeasurementRecords } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/measurements/client-measurement-records-repository.server";
import {
  PostgresClientMeasurements,
  recordMeasurementEntry,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/measurements/client-measurements-repository.server";
import { RandomMeasurementIds } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/measurements/random-measurement-ids.server";
import { PostgresProgressPhotos } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/photos/client-progress-photos-repository.server";
import { RandomProgressPhotoIds } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/photos/random-progress-photo-ids.server";
import {
  openClientProfile,
  recordPhotoConsent,
  seedCoaching,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/profiles/client-profile-writers.server";
import { PostgresClientProfiles } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/profiles/client-profiles-repository.server";
import { PostgresClientSettings } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/settings/client-settings-repository.server";
import type {
  ClientProfileFeature,
  ClientOnboardingFeature,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
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
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { ProductEmail } from "~/shared/email/index.server";
import { ClientOnboardingController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/onboarding/client-onboarding-controller.server";
import { OnboardingReviewController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/onboarding/onboarding-review-controller.server";
import type {
  CoachingSeedWriter,
  MeasurementEntryWriter,
  PhotoConsentWriter,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/client-profile-writer-ports.server";
import { PostgresClientOnboardings } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/onboardings/client-onboardings-repository.server";
import { RandomDetailRequestIds } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/reviews/random-detail-request-ids.server";
import {
  PostgresOnboardingReviews,
  type ReviewStampWriter,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/reviews/onboarding-reviews-repository.server";
import { EmailOnboardingDetailsNotifications } from "~/bounded-contexts/clients/client-profile/adapters/outbound/email/onboarding/email-onboarding-details-notifications.server";

type ClientProfileComposition = {
  feature: ClientProfileFeature;
  handles: {
    attachProgressPhotos: AttachProgressPhotosUseCase;
    clientSettings: ClientSettingsSource;
    measurementIds: MeasurementIds;
    measurements: ClientMeasurementsSource;
    openClientProfile: typeof openClientProfile;
    recordMeasurementEntry: typeof recordMeasurementEntry;
    recordPhotoConsent: typeof recordPhotoConsent;
    seedCoaching: typeof seedCoaching;
  };
};

type ClientProfileFeatureHandles = {
  clientAvatarRenditions: ClientAvatarRenditions;
  clientAvatarStore: ClientAvatarStore;
  clientIdentities: ClientIdentities;
  clientReach: ClientReach;
  clock: Clock;
  database: DatabaseClient;
  incidents: MeasurementIncidents & ClientAvatarIncidents;
  progressPhotoRenditions: ProgressPhotoRenditions;
  progressPhotoStore: ProgressPhotoStore;
};

export function composeClientProfileFeature(
  handles: ClientProfileFeatureHandles,
): ClientProfileComposition {
  const { clock } = handles;
  const avatars = new PostgresClientAvatars(handles.database);
  const measurements = new PostgresClientMeasurements(handles.database);
  const records = new PostgresClientMeasurementRecords(handles.database);
  const photos = new PostgresProgressPhotos(handles.database);
  const profiles = new PostgresClientProfiles(handles.database);
  const settings = new PostgresClientSettings(handles.database);
  const measurementIds = new RandomMeasurementIds();
  const progressPhotoPorts = {
    clients: handles.clientReach,
    photos,
    store: handles.progressPhotoStore,
    incidents: handles.incidents,
  };
  const photoIntakePorts = {
    ...progressPhotoPorts,
    photoIds: new RandomProgressPhotoIds(),
    renditions: handles.progressPhotoRenditions,
    clock,
  };
  const avatarPorts = {
    clients: handles.clientReach,
    avatars,
    avatarIds: new RandomClientAvatarIds(),
    store: handles.clientAvatarStore,
    renditions: handles.clientAvatarRenditions,
    incidents: handles.incidents,
    clock,
  };
  const profileReadingPorts = {
    identities: handles.clientIdentities,
    profiles,
    settings,
    avatars,
    measurements,
  };

  return {
    feature: {
      avatars: new ClientAvatarController({
        openClientAvatar: new OpenClientAvatarUseCase(avatarPorts),
      }),
      clientMeasurements: new ClientMeasurementsController({
        readOwnMeasurementHistory: new ReadOwnMeasurementHistoryUseCase({
          clients: handles.clientReach,
          clock,
          profiles,
          records,
          settings,
        }),
        recordMeasurements: new RecordMeasurementsUseCase({
          ...photoIntakePorts,
          measurementIds,
          profiles,
          records,
        }),
      }),
      clientSettings: new ClientSettingsController({
        readOwnClientSettings: new ReadOwnClientSettingsUseCase({
          clients: handles.clientReach,
          settings,
        }),
        saveUnitPreference: new SaveUnitPreferenceUseCase({
          changes: settings,
          clients: handles.clientReach,
          clock,
          settings,
        }),
      }),
      coachAvatars: new CoachClientAvatarController({
        listClientAvatars: new ListClientAvatarsUseCase({ avatars }),
        removeClientAvatarAsCoach: new RemoveClientAvatarAsCoachUseCase(
          avatarPorts,
        ),
        uploadClientAvatarAsCoach: new UploadClientAvatarAsCoachUseCase(
          avatarPorts,
        ),
      }),
      coachProfile: new ClientProfileController({
        readClientMeasurementHistory: new ReadClientMeasurementHistoryUseCase({
          records,
        }),
        readClientProfile: new ReadClientProfileUseCase(profileReadingPorts),
        updateClientProfile: new UpdateClientProfileAsCoachUseCase({
          clock,
          profiles,
        }),
      }),
      ownAvatar: new OwnClientAvatarController({
        readOwnClientAvatar: new ReadOwnClientAvatarUseCase(avatarPorts),
        removeOwnClientAvatar: new RemoveOwnClientAvatarUseCase(avatarPorts),
        uploadOwnClientAvatar: new UploadOwnClientAvatarUseCase(avatarPorts),
      }),
      ownProfile: new OwnClientProfileController({
        readOwnClientProfile: new ReadOwnClientProfileUseCase({
          ...profileReadingPorts,
          clients: handles.clientReach,
        }),
        updateOwnClientProfile: new UpdateOwnClientProfileUseCase({
          clients: handles.clientReach,
          clock,
          profiles,
        }),
      }),
      progressPhotos: new ProgressPhotoController({
        openProgressPhoto: new OpenProgressPhotoUseCase(progressPhotoPorts),
        removeProgressPhoto: new RemoveProgressPhotoUseCase(progressPhotoPorts),
      }),
    },
    handles: {
      attachProgressPhotos: new AttachProgressPhotosUseCase({
        ...photoIntakePorts,
        profiles,
      }),
      clientSettings: settings,
      measurementIds,
      measurements,
      openClientProfile,
      recordMeasurementEntry,
      recordPhotoConsent,
      seedCoaching,
    },
  };
}

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
