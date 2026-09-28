import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ReadClientOnboardingUseCase,
  SaveOnboardingDraftUseCase,
  SubmitOnboardingUseCase,
  type ClientOnboardingIncidents,
  type OnboardingClients,
  type OnboardingSubmissionStamps,
} from "@eli-coach-platform/domain/client-onboarding";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  SaveUnitPreferenceUseCase,
  type UnitPreferenceClients,
} from "@eli-coach-platform/domain/unit-preference";

import { ClientOnboardingController } from "~/features/client-onboarding/api/client/client-onboarding-controller.server";
import { PostgresClientOnboardings } from "~/features/client-onboarding/data/onboardings/client-onboardings-repository.server";
import { PostgresClientUnitPreferences } from "~/features/client-onboarding/data/unit-preferences/client-unit-preferences-repository.server";

export type ClientOnboardingFeature = {
  controller: ClientOnboardingController;
};

type ClientOnboardingFeatureHandles = {
  clock: Clock;
  database: DatabaseClient;
  incidents: ClientOnboardingIncidents;
  onboardingClients: OnboardingClients & UnitPreferenceClients;
  onboardingSubmissionStamps: OnboardingSubmissionStamps;
};

export function composeClientOnboardingFeature(
  handles: ClientOnboardingFeatureHandles,
): ClientOnboardingFeature {
  const { clock, incidents, onboardingClients: clients } = handles;
  const onboardings = new PostgresClientOnboardings(handles.database);
  const unitPreferences = new PostgresClientUnitPreferences(handles.database);

  return {
    controller: new ClientOnboardingController({
      clock,
      readClientOnboarding: new ReadClientOnboardingUseCase({
        clients,
        onboardings,
        unitPreferences,
      }),
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
  };
}
