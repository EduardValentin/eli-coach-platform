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
import { PostgresClientProfileOpeningsRepository } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/profiles/postgres-client-profile-openings-repository.server";
import { seedCoaching } from "./adapters/outbound/persistence/profiles/client-profile-writers.server";
import { recordPhotoConsent } from "./adapters/outbound/persistence/profiles/client-profile-writers.server";
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
  facades: { clientProfileFacade: ClientProfileFacade };
  feature: ClientProfileFeature;
  handles: {
    attachProgressPhotosUseCase: AttachProgressPhotosUseCase;
    clientSettingsSourcePort: ClientSettingsSourcePort;
    measurementIdsPort: MeasurementIdsPort;
    clientMeasurementsSourcePort: ClientMeasurementsSourcePort;
    recordMeasurementEntry: MeasurementEntryWriter;
    recordPhotoConsent: PhotoConsentWriter;
    seedCoaching: CoachingSeedWriter;
  };
};

type ClientMedia = {
  clientAvatarRenditionsPort: ClientAvatarRenditionsPort;
  clientAvatarStorePort: ClientAvatarStorePort;
  progressPhotoRenditionsPort: ProgressPhotoRenditionsPort;
  progressPhotoStorePort: ProgressPhotoStorePort;
};

type ClientProfileFeatureHandles = ClientMedia & {
  clientIdentitiesPort: ClientIdentitiesPort;
  clientReachPort: ClientReachPort;
  clockPort: ClockPort;
  database: DatabaseClient;
  loggerPort: LoggerPort;
};

export function composeClientProfileFeature(
  handles: ClientProfileFeatureHandles,
): ClientProfileComposition {
  const { clockPort } = handles;
  const clientProfileIncidentsAdapter = new ClientProfileIncidentsAdapter(
    handles.loggerPort,
  );
  const clientsClientReachAdapter = new ClientsClientReachAdapter(
    handles.clientReachPort,
  );
  const postgresClientAvatarsRepository = new PostgresClientAvatarsRepository(
    handles.database,
  );
  const postgresClientMeasurementsRepository =
    new PostgresClientMeasurementsRepository(handles.database);
  const postgresClientMeasurementRecordsRepository =
    new PostgresClientMeasurementRecordsRepository(handles.database);
  const postgresProgressPhotosRepository = new PostgresProgressPhotosRepository(
    handles.database,
  );
  const postgresClientProfilesRepository = new PostgresClientProfilesRepository(
    handles.database,
  );
  const postgresClientSettingsRepository = new PostgresClientSettingsRepository(
    handles.database,
  );
  const randomMeasurementIdsAdapter = new RandomMeasurementIdsAdapter();
  const progressPhotoPorts = {
    clientReachPort: clientsClientReachAdapter,
    progressPhotosPort: postgresProgressPhotosRepository,
    progressPhotoStorePort: handles.progressPhotoStorePort,
    measurementIncidentsPort: clientProfileIncidentsAdapter,
  };
  const photoIntakePorts = {
    ...progressPhotoPorts,
    progressPhotoIdsPort: new RandomProgressPhotoIdsAdapter(),
    progressPhotoRenditionsPort: handles.progressPhotoRenditionsPort,
    clockPort,
  };
  const avatarPorts = {
    clientReachPort: clientsClientReachAdapter,
    clientAvatarsPort: postgresClientAvatarsRepository,
    clientAvatarIdsPort: new RandomClientAvatarIdsAdapter(),
    clientAvatarStorePort: handles.clientAvatarStorePort,
    clientAvatarRenditionsPort: handles.clientAvatarRenditionsPort,
    clientAvatarIncidentsPort: clientProfileIncidentsAdapter,
    clockPort,
  };
  const profileReadingPorts = {
    clientIdentitiesPort: new ClientsClientIdentitiesAdapter(
      handles.clientIdentitiesPort,
    ),
    clientProfilesPort: postgresClientProfilesRepository,
    clientSettingsSourcePort: postgresClientSettingsRepository,
    clientAvatarsPort: postgresClientAvatarsRepository,
    clientMeasurementsSourcePort: postgresClientMeasurementsRepository,
  };

  return {
    facades: {
      clientProfileFacade: new ClientProfileFacadeAdapter(
        new OpenClientProfileUseCase({
          clientProfileOpeningsPort:
            new PostgresClientProfileOpeningsRepository(handles.database),
        }),
      ),
    },
    feature: {
      clientAvatarController: new ClientAvatarController({
        openClientAvatarUseCase: new OpenClientAvatarUseCase(avatarPorts),
      }),
      clientMeasurementsController: new ClientMeasurementsController({
        readOwnMeasurementHistoryUseCase: new ReadOwnMeasurementHistoryUseCase({
          clientReachPort: clientsClientReachAdapter,
          clockPort,
          clientProfilesPort: postgresClientProfilesRepository,
          clientMeasurementRecordsPort:
            postgresClientMeasurementRecordsRepository,
          clientSettingsSourcePort: postgresClientSettingsRepository,
        }),
        recordMeasurementsUseCase: new RecordMeasurementsUseCase({
          ...photoIntakePorts,
          measurementIdsPort: randomMeasurementIdsAdapter,
          clientProfilesPort: postgresClientProfilesRepository,
          clientMeasurementRecordsPort:
            postgresClientMeasurementRecordsRepository,
        }),
      }),
      clientSettingsController: new ClientSettingsController({
        readOwnClientSettingsUseCase: new ReadOwnClientSettingsUseCase({
          clientReachPort: clientsClientReachAdapter,
          clientSettingsSourcePort: postgresClientSettingsRepository,
        }),
        saveUnitPreferenceUseCase: new SaveUnitPreferenceUseCase({
          clientSettingsChangesPort: postgresClientSettingsRepository,
          clientReachPort: clientsClientReachAdapter,
          clockPort,
          clientSettingsSourcePort: postgresClientSettingsRepository,
        }),
      }),
      coachClientAvatarController: new CoachClientAvatarController({
        listClientAvatarsUseCase: new ListClientAvatarsUseCase({
          clientAvatarsPort: postgresClientAvatarsRepository,
        }),
        removeClientAvatarAsCoachUseCase: new RemoveClientAvatarAsCoachUseCase(
          avatarPorts,
        ),
        uploadClientAvatarAsCoachUseCase: new UploadClientAvatarAsCoachUseCase(
          avatarPorts,
        ),
      }),
      clientProfileController: new ClientProfileController({
        readClientMeasurementHistoryUseCase:
          new ReadClientMeasurementHistoryUseCase({
            clientMeasurementRecordsPort:
              postgresClientMeasurementRecordsRepository,
          }),
        readClientProfileUseCase: new ReadClientProfileUseCase(
          profileReadingPorts,
        ),
        updateClientProfileAsCoachUseCase:
          new UpdateClientProfileAsCoachUseCase({
            clockPort,
            clientProfilesPort: postgresClientProfilesRepository,
          }),
      }),
      ownClientAvatarController: new OwnClientAvatarController({
        readOwnClientAvatarUseCase: new ReadOwnClientAvatarUseCase(avatarPorts),
        removeOwnClientAvatarUseCase: new RemoveOwnClientAvatarUseCase(
          avatarPorts,
        ),
        uploadOwnClientAvatarUseCase: new UploadOwnClientAvatarUseCase(
          avatarPorts,
        ),
      }),
      ownClientProfileController: new OwnClientProfileController({
        readOwnClientProfileUseCase: new ReadOwnClientProfileUseCase({
          ...profileReadingPorts,
          clientReachPort: clientsClientReachAdapter,
        }),
        updateOwnClientProfileUseCase: new UpdateOwnClientProfileUseCase({
          clientReachPort: clientsClientReachAdapter,
          clockPort,
          clientProfilesPort: postgresClientProfilesRepository,
        }),
      }),
      progressPhotoController: new ProgressPhotoController({
        openProgressPhotoUseCase: new OpenProgressPhotoUseCase(
          progressPhotoPorts,
        ),
        removeProgressPhotoUseCase: new RemoveProgressPhotoUseCase(
          progressPhotoPorts,
        ),
      }),
    },
    handles: {
      attachProgressPhotosUseCase: new AttachProgressPhotosUseCase({
        ...photoIntakePorts,
        clientProfilesPort: postgresClientProfilesRepository,
      }),
      clientSettingsSourcePort: postgresClientSettingsRepository,
      measurementIdsPort: randomMeasurementIdsAdapter,
      clientMeasurementsSourcePort: postgresClientMeasurementsRepository,
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
  attachProgressPhotosUseCase: AttachProgressPhotosUseCase;
  clientIdentitiesPort: ClientIdentitiesPort;
  clientSettingsSourcePort: ClientSettingsSourcePort;
  clockPort: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  loggerPort: LoggerPort;
  measurementIdsPort: MeasurementIdsPort;
  clientMeasurementsSourcePort: ClientMeasurementsSourcePort;
  onboardingStandingsPort: OnboardingStandingsPort;
  onboardingSubmissionRecorderPort: OnboardingSubmissionRecorderPort;
  productEmailPort: ProductEmailPort;
  publicAppUrl: string;
  recordMeasurementEntry: MeasurementEntryWriter;
  recordPhotoConsent: PhotoConsentWriter;
  reviewStampRecorderPort: ReviewStampRecorderPort;
  seedCoaching: CoachingSeedWriter;
};

export function composeClientOnboardingFeature(
  handles: ClientOnboardingFeatureHandles,
): ClientOnboardingFeature {
  const { clockPort } = handles;
  const clientProfileIncidentsAdapter = new ClientProfileIncidentsAdapter(
    handles.loggerPort,
  );
  const clientsReviewStampsAdapter = new ClientsReviewStampsAdapter(
    handles.reviewStampRecorderPort,
  );
  const participants = new OnboardingParticipants({
    onboardingClientsPort: new ClientsOnboardingClientsAdapter(
      handles.onboardingStandingsPort,
    ),
    clientIdentitiesPort: new ClientsClientIdentitiesAdapter(
      handles.clientIdentitiesPort,
    ),
  });
  const postgresClientOnboardingsRepository =
    new PostgresClientOnboardingsRepository({
      database: handles.database,
      measurementEntryWriter: handles.recordMeasurementEntry,
      photoConsentWriter: handles.recordPhotoConsent,
    });
  const postgresOnboardingReviewsRepository =
    new PostgresOnboardingReviewsRepository({
      database: handles.database,
      onboardingReviewStampsPort: clientsReviewStampsAdapter,
      coachingSeedWriter: handles.seedCoaching,
    });
  const reviewPorts = {
    participants,
    clientOnboardingSourcePort: postgresClientOnboardingsRepository,
    onboardingReviewsPort: postgresOnboardingReviewsRepository,
    clientOnboardingIncidentsPort: clientProfileIncidentsAdapter,
  };
  const reviewReadPorts = {
    ...reviewPorts,
    onboardingReviewStampsPort: clientsReviewStampsAdapter,
  };

  return {
    clientOnboardingController: new ClientOnboardingController({
      answerOnboardingDetailsUseCase: new AnswerOnboardingDetailsUseCase({
        ...reviewPorts,
        clockPort,
        clientSettingsSourcePort: handles.clientSettingsSourcePort,
      }),
      attachProgressPhotosUseCase: handles.attachProgressPhotosUseCase,
      clockPort,
      readClientOnboardingUseCase: new ReadClientOnboardingUseCase({
        participants,
        clientOnboardingSourcePort: postgresClientOnboardingsRepository,
        clientSettingsSourcePort: handles.clientSettingsSourcePort,
      }),
      readOpenDetailRequestUseCase: new ReadOpenDetailRequestUseCase(
        reviewReadPorts,
      ),
      saveOnboardingDraftUseCase: new SaveOnboardingDraftUseCase({
        clientOnboardingChangesPort: postgresClientOnboardingsRepository,
        clockPort,
        clientOnboardingIncidentsPort: clientProfileIncidentsAdapter,
        clientOnboardingSourcePort: postgresClientOnboardingsRepository,
        participants,
      }),
      submitOnboardingUseCase: new SubmitOnboardingUseCase({
        clientOnboardingChangesPort: postgresClientOnboardingsRepository,
        clockPort,
        clientOnboardingIncidentsPort: clientProfileIncidentsAdapter,
        measurementIdsPort: handles.measurementIdsPort,
        clientOnboardingSourcePort: postgresClientOnboardingsRepository,
        participants,
        onboardingSubmissionStampsPort: new ClientsSubmissionStampsAdapter(
          handles.onboardingSubmissionRecorderPort,
        ),
        clientSettingsSourcePort: handles.clientSettingsSourcePort,
      }),
    }),
    onboardingReviewController: new OnboardingReviewController({
      approveOnboardingAnswersUseCase: new ApproveOnboardingAnswersUseCase({
        ...reviewPorts,
        clockPort,
      }),
      openOnboardingReviewUseCase: new OpenOnboardingReviewUseCase({
        ...reviewPorts,
        clockPort,
      }),
      readOnboardingReviewUseCase: new ReadOnboardingReviewUseCase({
        ...reviewReadPorts,
        clientMeasurementsSourcePort: handles.clientMeasurementsSourcePort,
      }),
      requestOnboardingDetailsUseCase: new RequestOnboardingDetailsUseCase({
        ...reviewPorts,
        clockPort,
        onboardingDetailsNotificationsPort:
          new EmailOnboardingDetailsNotificationsAdapter(
            handles.productEmailPort,
            {
              appBasePath: handles.appBasePath,
              clockPort,
              contactEmail: handles.contactEmail,
              publicAppUrl: handles.publicAppUrl,
            },
          ),
        detailRequestIdsPort: new RandomDetailRequestIdsAdapter(),
      }),
    }),
  };
}

export function composeClientMedia(config: ClientFilesConfig): ClientMedia {
  return {
    clientAvatarRenditionsPort: createClientAvatarRenditionsAdapter(),
    clientAvatarStorePort: createClientAvatarStoreAdapter(config),
    progressPhotoRenditionsPort: createProgressPhotoRenditionsAdapter(),
    progressPhotoStorePort: createProgressPhotoStoreAdapter(config),
  };
}
