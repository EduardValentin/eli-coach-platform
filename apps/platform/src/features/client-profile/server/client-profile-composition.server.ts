import type { DatabaseClient } from "@eli-coach-platform/db";
import type { ClientIdentities } from "@eli-coach-platform/domain/client";
import { ReadClientProfileUseCase } from "@eli-coach-platform/domain/client-profile";
import type { ClientMeasurementsSource } from "@eli-coach-platform/domain/measurement";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  SaveUnitPreferenceUseCase,
  type ClientUnitPreferencesSource,
  type UnitPreferenceClients,
} from "@eli-coach-platform/domain/unit-preference";

import { UnitPreferenceController } from "~/features/client-profile/api/client/unit-preference-controller.server";
import { ClientProfileController } from "~/features/client-profile/api/coach/client-profile-controller.server";
import {
  PostgresClientMeasurements,
  recordMeasurementEntry,
} from "~/features/client-profile/data/measurements/client-measurements-repository.server";
import {
  PostgresClientProfiles,
  saveClientProfile,
} from "~/features/client-profile/data/profiles/client-profiles-repository.server";
import { PostgresClientUnitPreferences } from "~/features/client-profile/data/unit-preferences/client-unit-preferences-repository.server";

export type ClientProfileFeature = {
  coachProfile: ClientProfileController;
  unitPreference: UnitPreferenceController;
};

type ClientProfileComposition = {
  feature: ClientProfileFeature;
  handles: {
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
  unitPreferenceClients: UnitPreferenceClients;
};

export function composeClientProfileFeature(
  handles: ClientProfileFeatureHandles,
): ClientProfileComposition {
  const measurements = new PostgresClientMeasurements(handles.database);
  const unitPreferences = new PostgresClientUnitPreferences(handles.database);

  return {
    feature: {
      coachProfile: new ClientProfileController({
        measurements,
        readClientProfile: new ReadClientProfileUseCase({
          identities: handles.clientIdentities,
          measurements,
          profiles: new PostgresClientProfiles(handles.database),
        }),
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
      measurements,
      recordMeasurementEntry,
      saveClientProfile,
      unitPreferences,
    },
  };
}
