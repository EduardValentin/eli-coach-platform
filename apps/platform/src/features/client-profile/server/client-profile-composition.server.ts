import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientIdentities,
  ClientReach,
} from "@eli-coach-platform/domain/client";
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
} from "@eli-coach-platform/domain/client-profile";
import {
  ReadOwnClientSettingsUseCase,
  SaveUnitPreferenceUseCase,
  type ClientSettingsSource,
} from "@eli-coach-platform/domain/client-settings";
import type {
  ClientMeasurementsSource,
  MeasurementIds,
} from "@eli-coach-platform/domain/measurement";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { ClientAvatarController } from "~/features/client-profile/api/avatar/client-avatar-controller.server";
import { ClientSettingsController } from "~/features/client-profile/api/client/client-settings-controller.server";
import { ClientMeasurementsController } from "~/features/client-profile/api/client/measurements-controller.server";
import { OwnClientAvatarController } from "~/features/client-profile/api/client/own-client-avatar-controller.server";
import { OwnClientProfileController } from "~/features/client-profile/api/client/own-client-profile-controller.server";
import { ClientProfileController } from "~/features/client-profile/api/coach/client-profile-controller.server";
import { CoachClientAvatarController } from "~/features/client-profile/api/coach/coach-client-avatar-controller.server";
import { ProgressPhotoController } from "~/features/client-profile/api/photos/progress-photo-controller.server";
import { PostgresClientAvatars } from "~/features/client-profile/data/avatars/client-avatars-repository.server";
import { RandomClientAvatarIds } from "~/features/client-profile/data/avatars/random-client-avatar-ids.server";
import { PostgresClientMeasurementRecords } from "~/features/client-profile/data/measurements/client-measurement-records-repository.server";
import {
  PostgresClientMeasurements,
  recordMeasurementEntry,
} from "~/features/client-profile/data/measurements/client-measurements-repository.server";
import { RandomMeasurementIds } from "~/features/client-profile/data/measurements/random-measurement-ids.server";
import { PostgresProgressPhotos } from "~/features/client-profile/data/photos/client-progress-photos-repository.server";
import { RandomProgressPhotoIds } from "~/features/client-profile/data/photos/random-progress-photo-ids.server";
import {
  openClientProfile,
  recordPhotoConsent,
  seedCoaching,
} from "~/features/client-profile/data/profiles/client-profile-writers.server";
import { PostgresClientProfiles } from "~/features/client-profile/data/profiles/client-profiles-repository.server";
import { PostgresClientSettings } from "~/features/client-profile/data/settings/client-settings-repository.server";

export type ClientProfileFeature = {
  avatars: ClientAvatarController;
  clientMeasurements: ClientMeasurementsController;
  clientSettings: ClientSettingsController;
  coachAvatars: CoachClientAvatarController;
  coachProfile: ClientProfileController;
  ownAvatar: OwnClientAvatarController;
  ownProfile: OwnClientProfileController;
  progressPhotos: ProgressPhotoController;
};

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
