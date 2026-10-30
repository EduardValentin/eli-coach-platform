import type { DatabaseClient } from "~/shared/database";
import type {
  ClientIdentitiesPort,
  ClientReachPort,
  OnboardingStandingsPort,
  OnboardingSubmissionRecorderPort,
  ReviewStampRecorderPort,
} from "~/bounded-contexts/clients/clients/public";
import type { ClientProfileFacade } from "~/bounded-contexts/clients/public/client-profile-facade";
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
  type ClientAvatarRenditionsPort,
  type ClientAvatarStorePort,
  type ProgressPhotoRenditionsPort,
  type ProgressPhotoStorePort,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import {
  ReadOwnClientSettingsUseCase,
  SaveUnitPreferenceUseCase,
  type ClientSettingsSourcePort,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import type {
  ClientMeasurementsSourcePort,
  MeasurementIdsPort,
} from "~/bounded-contexts/clients/client-profile/domain/measurement";
import type { ClockPort } from "~/bounded-contexts/clients/client-profile/domain/clock-port";
import { ClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/avatar/client-avatar-controller.server";
import { ClientSettingsController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/client-settings-controller.server";
import { ClientMeasurementsController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/client-measurements-controller.server";
import { OwnClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/own-client-avatar-controller.server";
import { OwnClientProfileController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/client/own-client-profile-controller.server";
import { ClientProfileController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/coach/client-profile-controller.server";
import { CoachClientAvatarController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/coach/coach-client-avatar-controller.server";
import { ProgressPhotoController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/photos/progress-photo-controller.server";
import { PostgresClientAvatarsRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/avatars/postgres-client-avatars-repository.server";
import { RandomClientAvatarIdsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/avatars/random-client-avatar-ids-adapter.server";
import { PostgresClientMeasurementRecordsRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/measurements/postgres-client-measurement-records-repository.server";
import {
  PostgresClientMeasurementsRepository,
  recordMeasurementEntry,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/measurements/postgres-client-measurements-repository.server";
import { RandomMeasurementIdsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/measurements/random-measurement-ids-adapter.server";
import { PostgresProgressPhotosRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/photos/postgres-progress-photos-repository.server";
import { RandomProgressPhotoIdsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/photos/random-progress-photo-ids-adapter.server";
import {
  PostgresClientProfileOpeningsRepository,
  recordPhotoConsent,
  seedCoaching,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/profiles/postgres-client-profile-openings-repository.server";
import { ClientProfileFacadeAdapter } from "~/bounded-contexts/clients/client-profile/adapters/inbound/facades/client-profile-facade-adapter.server";
import { ClientsClientIdentitiesAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/clients-client-identities-adapter.server";
import { ClientsClientReachAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/clients-client-reach-adapter.server";
import { ClientsOnboardingClientsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/clients-onboarding-clients-adapter.server";
import { ClientsReviewStampsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/clients-review-stamps-adapter.server";
import { ClientsSubmissionStampsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/clients/clients-submission-stamps-adapter.server";
import { PostgresClientProfilesRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/profiles/postgres-client-profiles-repository.server";
import { PostgresClientSettingsRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/settings/postgres-client-settings-repository.server";
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
import type { ProductEmailPort } from "~/shared/email/index.server";
import { ClientOnboardingController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/onboarding/client-onboarding-controller.server";
import { OnboardingReviewController } from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/onboarding/onboarding-review-controller.server";
import type {
  CoachingSeedWriter,
  MeasurementEntryWriter,
  PhotoConsentWriter,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/client-profile-writer-ports.server";
import { PostgresClientOnboardingsRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/onboardings/postgres-client-onboardings-repository.server";
import { RandomDetailRequestIdsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/reviews/random-detail-request-ids-adapter.server";
import { PostgresOnboardingReviewsRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/onboarding/reviews/postgres-onboarding-reviews-repository.server";
import { EmailOnboardingDetailsNotificationsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/email/onboarding/email-onboarding-details-notifications-adapter.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { ClientProfileIncidentsAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/logging/client-profile-incidents-adapter.server";
import { createClientAvatarStoreAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/create-client-avatar-store-adapter.server";
import { createProgressPhotoStoreAdapter } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/create-progress-photo-store-adapter.server";
import { createClientAvatarRenditionsAdapter } from "./adapters/outbound/persistence/create-client-avatar-renditions-adapter.server";
import { createProgressPhotoRenditionsAdapter } from "./adapters/outbound/persistence/create-progress-photo-renditions-adapter.server";
import type { ClientFilesConfig } from "~/bounded-contexts/clients/client-profile/config.server";

type ClientProfileComposition = {
  facades: { clientProfile: ClientProfileFacade };
  feature: ClientProfileFeature;
  handles: {
    attachProgressPhotos: AttachProgressPhotosUseCase;
    clientSettings: ClientSettingsSourcePort;
    measurementIds: MeasurementIdsPort;
    measurements: ClientMeasurementsSourcePort;
    recordMeasurementEntry: MeasurementEntryWriter;
    recordPhotoConsent: PhotoConsentWriter;
    seedCoaching: CoachingSeedWriter;
  };
};

type ClientMedia = {
  clientAvatarRenditions: ClientAvatarRenditionsPort;
  clientAvatarStore: ClientAvatarStorePort;
  progressPhotoRenditions: ProgressPhotoRenditionsPort;
  progressPhotoStore: ProgressPhotoStorePort;
};

type ClientProfileFeatureHandles = ClientMedia & {
  clientIdentities: ClientIdentitiesPort;
  clientReach: ClientReachPort;
  clock: ClockPort;
  database: DatabaseClient;
  logger: LoggerPort;
};

export function composeClientProfileFeature(
  handles: ClientProfileFeatureHandles,
): ClientProfileComposition {
  const { clock } = handles;
  const incidents = new ClientProfileIncidentsAdapter(handles.logger);
  const clientReach = new ClientsClientReachAdapter(handles.clientReach);
  const avatars = new PostgresClientAvatarsRepository(handles.database);
  const measurements = new PostgresClientMeasurementsRepository(
    handles.database,
  );
  const records = new PostgresClientMeasurementRecordsRepository(
    handles.database,
  );
  const photos = new PostgresProgressPhotosRepository(handles.database);
  const profiles = new PostgresClientProfilesRepository(handles.database);
  const settings = new PostgresClientSettingsRepository(handles.database);
  const measurementIds = new RandomMeasurementIdsAdapter();
  const progressPhotoPorts = {
    clients: clientReach,
    photos,
    store: handles.progressPhotoStore,
    incidents,
  };
  const photoIntakePorts = {
    ...progressPhotoPorts,
    photoIds: new RandomProgressPhotoIdsAdapter(),
    renditions: handles.progressPhotoRenditions,
    clock,
  };
  const avatarPorts = {
    clients: clientReach,
    avatars,
    avatarIds: new RandomClientAvatarIdsAdapter(),
    store: handles.clientAvatarStore,
    renditions: handles.clientAvatarRenditions,
    incidents,
    clock,
  };
  const profileReadingPorts = {
    identities: new ClientsClientIdentitiesAdapter(handles.clientIdentities),
    profiles,
    settings,
    avatars,
    measurements,
  };

  return {
    facades: {
      clientProfile: new ClientProfileFacadeAdapter(
        new OpenClientProfileUseCase({
          openings: new PostgresClientProfileOpeningsRepository(
            handles.database,
          ),
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
  clientIdentities: ClientIdentitiesPort;
  clientSettings: ClientSettingsSourcePort;
  clock: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  logger: LoggerPort;
  measurementIds: MeasurementIdsPort;
  measurements: ClientMeasurementsSourcePort;
  onboardingStandings: OnboardingStandingsPort;
  onboardingSubmissions: OnboardingSubmissionRecorderPort;
  productEmail: ProductEmailPort;
  publicAppUrl: string;
  recordMeasurementEntry: MeasurementEntryWriter;
  recordPhotoConsent: PhotoConsentWriter;
  reviewStampRecorder: ReviewStampRecorderPort;
  seedCoaching: CoachingSeedWriter;
};

export function composeClientOnboardingFeature(
  handles: ClientOnboardingFeatureHandles,
): ClientOnboardingFeature {
  const { clock } = handles;
  const incidents = new ClientProfileIncidentsAdapter(handles.logger);
  const reviewStamps = new ClientsReviewStampsAdapter(
    handles.reviewStampRecorder,
  );
  const participants = new OnboardingParticipants({
    clients: new ClientsOnboardingClientsAdapter(handles.onboardingStandings),
    identities: new ClientsClientIdentitiesAdapter(handles.clientIdentities),
  });
  const onboardings = new PostgresClientOnboardingsRepository({
    database: handles.database,
    measurementEntryWriter: handles.recordMeasurementEntry,
    photoConsentWriter: handles.recordPhotoConsent,
  });
  const reviews = new PostgresOnboardingReviewsRepository({
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
        stamps: new ClientsSubmissionStampsAdapter(
          handles.onboardingSubmissions,
        ),
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
        notifications: new EmailOnboardingDetailsNotificationsAdapter(
          handles.productEmail,
          {
            appBasePath: handles.appBasePath,
            clock,
            contactEmail: handles.contactEmail,
            publicAppUrl: handles.publicAppUrl,
          },
        ),
        ids: new RandomDetailRequestIdsAdapter(),
      }),
    }),
  };
}

export function composeClientMedia(config: ClientFilesConfig): ClientMedia {
  return {
    clientAvatarRenditions: createClientAvatarRenditionsAdapter(),
    clientAvatarStore: createClientAvatarStoreAdapter(config),
    progressPhotoRenditions: createProgressPhotoRenditionsAdapter(),
    progressPhotoStore: createProgressPhotoStoreAdapter(config),
  };
}
