import type { DatabaseClient } from "~/shared/database";
import type {
  ClientIdentities,
  ClientReach,
  OnboardingStandings,
  OnboardingSubmissionRecorder,
  ReviewStampRecorder,
} from "~/bounded-contexts/clients/clients/public";
import type { ClientProfileFacade } from "~/bounded-contexts/clients/public/client-profile";
import {
  AttachProgressPhotosUseCase,
  ListClientAvatarsUseCase,
  OpenClientAvatarUseCase,
  OpenClientProfileUseCase,
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
  type ClientAvatarRenditions,
  type ClientAvatarStore,
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
  PostgresClientProfileOpenings,
  recordPhotoConsent,
  seedCoaching,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/profiles/client-profile-writers.server";
import { createClientProfileFacade } from "~/bounded-contexts/clients/client-profile/adapters/inbound/facades/client-profile.server";
import { ClientsClientIdentities } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/client-identities.server";
import { ClientsClientReach } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/client-reach.server";
import { ClientsOnboardingClients } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/onboarding-clients.server";
import { ClientsReviewStamps } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/review-stamps.server";
import { ClientsSubmissionStamps } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/submission-stamps.server";
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
import { PostgresOnboardingReviews } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/reviews/onboarding-reviews-repository.server";
import { EmailOnboardingDetailsNotifications } from "~/bounded-contexts/clients/client-profile/adapters/outbound/email/onboarding/email-onboarding-details-notifications.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createClientProfileIncidents } from "~/bounded-contexts/clients/client-profile/adapters/outbound/logging/client-profile-incidents.server";
import {
  createClientAvatarStore,
  createProgressPhotoStore,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/client-media-stores.server";
import { createClientAvatarRenditions } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/client-avatar-renditions.server";
import { createProgressPhotoRenditions } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/progress-photo-renditions.server";
import type { ClientFilesConfig } from "~/bounded-contexts/clients/client-profile/config.server";

type ClientProfileComposition = {
  facades: { clientProfile: ClientProfileFacade };
  feature: ClientProfileFeature;
  handles: {
    attachProgressPhotos: AttachProgressPhotosUseCase;
    clientSettings: ClientSettingsSource;
    measurementIds: MeasurementIds;
    measurements: ClientMeasurementsSource;
    recordMeasurementEntry: MeasurementEntryWriter;
    recordPhotoConsent: PhotoConsentWriter;
    seedCoaching: CoachingSeedWriter;
  };
};

type ClientMedia = {
  clientAvatarRenditions: ClientAvatarRenditions;
  clientAvatarStore: ClientAvatarStore;
  progressPhotoRenditions: ProgressPhotoRenditions;
  progressPhotoStore: ProgressPhotoStore;
};

type ClientProfileFeatureHandles = ClientMedia & {
  clientIdentities: ClientIdentities;
  clientReach: ClientReach;
  clock: Clock;
  database: DatabaseClient;
  logger: Logger;
};

export function composeClientProfileFeature(
  handles: ClientProfileFeatureHandles,
): ClientProfileComposition {
  const { clock } = handles;
  const incidents = createClientProfileIncidents(handles.logger);
  const clientReach = new ClientsClientReach(handles.clientReach);
  const avatars = new PostgresClientAvatars(handles.database);
  const measurements = new PostgresClientMeasurements(handles.database);
  const records = new PostgresClientMeasurementRecords(handles.database);
  const photos = new PostgresProgressPhotos(handles.database);
  const profiles = new PostgresClientProfiles(handles.database);
  const settings = new PostgresClientSettings(handles.database);
  const measurementIds = new RandomMeasurementIds();
  const progressPhotoPorts = {
    clients: clientReach,
    photos,
    store: handles.progressPhotoStore,
    incidents,
  };
  const photoIntakePorts = {
    ...progressPhotoPorts,
    photoIds: new RandomProgressPhotoIds(),
    renditions: handles.progressPhotoRenditions,
    clock,
  };
  const avatarPorts = {
    clients: clientReach,
    avatars,
    avatarIds: new RandomClientAvatarIds(),
    store: handles.clientAvatarStore,
    renditions: handles.clientAvatarRenditions,
    incidents,
    clock,
  };
  const profileReadingPorts = {
    identities: new ClientsClientIdentities(handles.clientIdentities),
    profiles,
    settings,
    avatars,
    measurements,
  };

  return {
    facades: {
      clientProfile: createClientProfileFacade(
        new OpenClientProfileUseCase({
          openings: new PostgresClientProfileOpenings(handles.database),
        }),
      ),
    },
    feature: {
      avatars: new ClientAvatarController({
        openClientAvatar: new OpenClientAvatarUseCase(avatarPorts),
      }),
      clientMeasurements: new ClientMeasurementsController({
        readOwnMeasurementHistory: new ReadOwnMeasurementHistoryUseCase({
          clients: clientReach,
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
          clients: clientReach,
          settings,
        }),
        saveUnitPreference: new SaveUnitPreferenceUseCase({
          changes: settings,
          clients: clientReach,
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
          clients: clientReach,
        }),
        updateOwnClientProfile: new UpdateOwnClientProfileUseCase({
          clients: clientReach,
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
      recordMeasurementEntry: (record) =>
        recordMeasurementEntry(handles.database, record),
      recordPhotoConsent: (consent) =>
        recordPhotoConsent(handles.database, consent),
      seedCoaching: (seeding) => seedCoaching(handles.database, seeding),
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
  logger: Logger;
  measurementIds: MeasurementIds;
  measurements: ClientMeasurementsSource;
  onboardingStandings: OnboardingStandings;
  onboardingSubmissions: OnboardingSubmissionRecorder;
  productEmail: ProductEmail;
  publicAppUrl: string;
  recordMeasurementEntry: MeasurementEntryWriter;
  recordPhotoConsent: PhotoConsentWriter;
  reviewStampRecorder: ReviewStampRecorder;
  seedCoaching: CoachingSeedWriter;
};

export function composeClientOnboardingFeature(
  handles: ClientOnboardingFeatureHandles,
): ClientOnboardingFeature {
  const { clock } = handles;
  const incidents = createClientProfileIncidents(handles.logger);
  const reviewStamps = new ClientsReviewStamps(handles.reviewStampRecorder);
  const participants = new OnboardingParticipants({
    clients: new ClientsOnboardingClients(handles.onboardingStandings),
    identities: new ClientsClientIdentities(handles.clientIdentities),
  });
  const onboardings = new PostgresClientOnboardings({
    database: handles.database,
    measurementEntryWriter: handles.recordMeasurementEntry,
    photoConsentWriter: handles.recordPhotoConsent,
  });
  const reviews = new PostgresOnboardingReviews({
    database: handles.database,
    reviewStamps,
    coachingSeedWriter: handles.seedCoaching,
  });
  const reviewPorts = { participants, onboardings, reviews, incidents };
  const reviewReadPorts = {
    ...reviewPorts,
    stamps: reviewStamps,
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
        stamps: new ClientsSubmissionStamps(handles.onboardingSubmissions),
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

export function composeClientMedia(config: ClientFilesConfig): ClientMedia {
  return {
    clientAvatarRenditions: createClientAvatarRenditions(),
    clientAvatarStore: createClientAvatarStore(config),
    progressPhotoRenditions: createProgressPhotoRenditions(),
    progressPhotoStore: createProgressPhotoStore(config),
  };
}
