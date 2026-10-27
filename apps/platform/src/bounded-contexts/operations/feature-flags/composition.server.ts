import type { DatabaseClient } from "~/shared/database";
import type { MiddlewareFunction } from "react-router";
import type { RuntimeStage } from "~/shared/runtime/production-runtime";
import {
  GetFeatureFlagsUseCase,
  type FeatureFlagReader,
} from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";

import { FeatureFlagController } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/feature-flags-controller.server";
import type { FeatureFlagsFeature } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/context.server";
import {
  composeBrowserFeatureFlagOverrides,
  composeWithoutFeatureFlagOverrides,
} from "~/bounded-contexts/operations/feature-flags/adapters/outbound/overrides/feature-flag-overrides.server";
import { PostgresFeatureFlagRepository } from "~/bounded-contexts/operations/feature-flags/adapters/outbound/persistence/feature-flags-repository.server";
import {
  resolveFeatureFlagOverridesMode,
  type FeatureFlagsConfig,
} from "~/bounded-contexts/operations/feature-flags/config.server";

type FeatureFlagsComposition = {
  feature: FeatureFlagsFeature;
  middleware: MiddlewareFunction<Response>;
  reader: FeatureFlagReader;
};

type FeatureFlagsFeatureHandles = {
  appBasePath: string;
  database: DatabaseClient;
  featureFlagsConfig: FeatureFlagsConfig & Pick<RuntimeStage, "ENVIRONMENT">;
};

export function composeFeatureFlagsFeature(
  handles: FeatureFlagsFeatureHandles,
): FeatureFlagsComposition {
  const storedFlags = new GetFeatureFlagsUseCase({
    featureFlags: new PostgresFeatureFlagRepository(handles.database),
  });
  const overrides =
    resolveFeatureFlagOverridesMode(handles.featureFlagsConfig) === "browser"
      ? composeBrowserFeatureFlagOverrides({
          appBasePath: handles.appBasePath,
          featureFlags: storedFlags,
        })
      : composeWithoutFeatureFlagOverrides(storedFlags);

  return {
    feature: {
      featureFlags: new FeatureFlagController(overrides.featureFlags),
    },
    middleware: overrides.middleware,
    reader: overrides.featureFlags,
  };
}
