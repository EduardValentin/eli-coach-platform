import type { DatabaseClient } from "~/shared/database";
import type { MiddlewareFunction } from "react-router";
import type { RuntimeStage } from "~/shared/runtime/production-runtime";
import { GetFeatureFlagsUseCase } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { FeatureFlagsFacade } from "../public/feature-flags-facade";

import { FeatureFlagController } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/feature-flag-controller.server";
import type { FeatureFlagsFeature } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/context.server";
import { FeatureFlagsFacadeAdapter } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/facades/feature-flags-facade-adapter.server";
import {
  composeBrowserFeatureFlagOverrides,
  composeWithoutFeatureFlagOverrides,
} from "~/bounded-contexts/operations/feature-flags/adapters/outbound/overrides/feature-flag-overrides.server";
import { PostgresFeatureFlagRepository } from "~/bounded-contexts/operations/feature-flags/adapters/outbound/persistence/postgres-feature-flag-repository.server";
import {
  resolveFeatureFlagOverridesMode,
  type FeatureFlagsConfig,
} from "~/bounded-contexts/operations/feature-flags/config.server";

type FeatureFlagsComposition = {
  facades: { featureFlags: FeatureFlagsFacade };
  feature: FeatureFlagsFeature;
  middleware: MiddlewareFunction<Response>;
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
    facades: {
      featureFlags: new FeatureFlagsFacadeAdapter(overrides.featureFlags),
    },
    feature: {
      featureFlags: new FeatureFlagController(overrides.featureFlags),
    },
    middleware: overrides.middleware,
  };
}
