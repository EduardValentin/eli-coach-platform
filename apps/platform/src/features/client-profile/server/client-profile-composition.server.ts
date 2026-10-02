import type { DatabaseClient } from "@eli-coach-platform/db";
import type { ClientIdentities } from "@eli-coach-platform/domain/client";
import {
  AttachProgressPhotosUseCase,
  OpenProgressPhotoUseCase,
  ReadClientMeasurementHistoryUseCase,
  ReadClientProfileUseCase,
  ReadOwnMeasurementHistoryUseCase,
  RecordMeasurementsUseCase,
  RemoveProgressPhotoUseCase,
  type MeasurementClients,
  type MeasurementIncidents,
  type ProgressPhotoRenditions,
  type ProgressPhotoStore,
} from "@eli-coach-platform/domain/client-profile";
import type { ClientMeasurementsSource } from "@eli-coach-platform/domain/measurement";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  SaveUnitPreferenceUseCase,
  type ClientUnitPreferencesSource,
  type UnitPreferenceClients,
} from "@eli-coach-platform/domain/unit-preference";

import { ClientMeasurementsController } from "~/features/client-profile/api/client/measurements-controller.server";
import { UnitPreferenceController } from "~/features/client-profile/api/client/unit-preference-controller.server";
import { ClientProfileController } from "~/features/client-profile/api/coach/client-profile-controller.server";
import { ProgressPhotoController } from "~/features/client-profile/api/photos/progress-photo-controller.server";
import { PostgresClientMeasurementRecords } from "~/features/client-profile/data/measurements/client-measurement-records-repository.server";
import {
  PostgresClientMeasurements,
  recordMeasurementEntry,
} from "~/features/client-profile/data/measurements/client-measurements-repository.server";
import { PostgresProgressPhotos } from "~/features/client-profile/data/photos/client-progress-photos-repository.server";
import { RandomProgressPhotoIds } from "~/features/client-profile/data/photos/random-progress-photo-ids.server";
import {
  PostgresClientProfiles,
  saveClientProfile,
} from "~/features/client-profile/data/profiles/client-profiles-repository.server";
import { PostgresClientUnitPreferences } from "~/features/client-profile/data/unit-preferences/client-unit-preferences-repository.server";

export type ClientProfileFeature = {
  clientMeasurements: ClientMeasurementsController;
  coachProfile: ClientProfileController;
  progressPhotos: ProgressPhotoController;
  unitPreference: UnitPreferenceController;
};

type ClientProfileComposition = {
  feature: ClientProfileFeature;
  handles: {
    attachProgressPhotos: AttachProgressPhotosUseCase;
    measurements: ClientMeasurementsSource;
    recordMeasurementEntry: typeof recordMeasurementEntry;
    saveClientProfile: typeof saveClientProfile;
    unitPreferences: ClientUnitPreferencesSource;
  };
};

type ClientProfileFeatureHandles = {
  clientIdentities: ClientIdentities;
  clock: Clock;
  database: DatabaseClient;
  incidents: MeasurementIncidents;
  measurementClients: MeasurementClients;
  progressPhotoRenditions: ProgressPhotoRenditions;
  progressPhotoStore: ProgressPhotoStore;
  unitPreferenceClients: UnitPreferenceClients;
};

export function composeClientProfileFeature(
  handles: ClientProfileFeatureHandles,
): ClientProfileComposition {
  const measurements = new PostgresClientMeasurements(handles.database);
  const records = new PostgresClientMeasurementRecords(handles.database);
  const photos = new PostgresProgressPhotos(handles.database);
  const profiles = new PostgresClientProfiles(handles.database);
  const unitPreferences = new PostgresClientUnitPreferences(handles.database);
  const progressPhotoPorts = {
    clients: handles.measurementClients,
    photos,
    store: handles.progressPhotoStore,
    incidents: handles.incidents,
  };
  const photoIntakePorts = {
    ...progressPhotoPorts,
    photoIds: new RandomProgressPhotoIds(),
    renditions: handles.progressPhotoRenditions,
    clock: handles.clock,
  };

  return {
    feature: {
      clientMeasurements: new ClientMeasurementsController({
        readOwnMeasurementHistory: new ReadOwnMeasurementHistoryUseCase({
          clients: handles.measurementClients,
          clock: handles.clock,
          profiles,
          records,
          unitPreferences,
        }),
        recordMeasurements: new RecordMeasurementsUseCase({
          ...photoIntakePorts,
          profiles,
          records,
        }),
      }),
      coachProfile: new ClientProfileController({
        readClientMeasurementHistory: new ReadClientMeasurementHistoryUseCase({
          records,
        }),
        readClientProfile: new ReadClientProfileUseCase({
          identities: handles.clientIdentities,
          measurements,
          profiles,
        }),
      }),
      progressPhotos: new ProgressPhotoController({
        openProgressPhoto: new OpenProgressPhotoUseCase(progressPhotoPorts),
        removeProgressPhoto: new RemoveProgressPhotoUseCase(progressPhotoPorts),
      }),
      unitPreference: new UnitPreferenceController({
        saveUnitPreference: new SaveUnitPreferenceUseCase({
          clients: handles.unitPreferenceClients,
          clock: handles.clock,
          preferences: unitPreferences,
        }),
      }),
    },
    handles: {
      attachProgressPhotos: new AttachProgressPhotosUseCase({
        ...photoIntakePorts,
        profiles,
      }),
      measurements,
      recordMeasurementEntry,
      saveClientProfile,
      unitPreferences,
    },
  };
}
