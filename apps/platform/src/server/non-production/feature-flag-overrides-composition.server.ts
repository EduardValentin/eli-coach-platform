import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { GetFeatureFlagsUseCase } from "@eli-coach-platform/domain/feature-flag";
import { PostgresFeatureFlagRepository } from "@eli-coach-platform/infrastructure/feature-flags/server";
import type { MiddlewareFunction } from "react-router";

import {
  getPlatformContainer,
  type PlatformContainer,
} from "~/server/container.server";
import { createPlatformDatabase } from "~/server/database.server";
import { createFeatureFlagOverrideReader } from "~/server/feature-flags/feature-flag-override-reader.server";
import { composePlatformContainer } from "~/server/platform-container-composition.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

import { createFeatureFlagOverrideMiddleware } from "./feature-flag-overrides-http.server";

let nonProductionContainer: PlatformContainer | null = null;

export const featureFlagOverrideMiddleware =
  createRuntimeFeatureFlagOverrideMiddleware({
    environment: getRuntimeEnvironment,
  });

export function createRuntimeFeatureFlagOverrideMiddleware(options: {
  environment: () => { APP_BASE_PATH: string; ENVIRONMENT: string };
}): MiddlewareFunction<Response> {
  return function applyFeatureFlagOverrides(args, next) {
    const environment = options.environment();

    if (!featureFlagOverridesAllowed(environment.ENVIRONMENT)) {
      return next();
    }

    return createFeatureFlagOverrideMiddleware({
      appBasePath: environment.APP_BASE_PATH,
    })(args, next);
  };
}

export function getFeatureFlagOverrideContainer(): PlatformContainer {
  const environment = getRuntimeEnvironment();

  if (!featureFlagOverridesAllowed(environment.ENVIRONMENT)) {
    return getPlatformContainer();
  }

  nonProductionContainer ??= createFeatureFlagOverrideContainer({
    runtimeEnvironment: environment,
  });

  return nonProductionContainer;
}

export function featureFlagOverridesAllowed(environment: string): boolean {
  return environment === "local" || environment === "test";
}

function createFeatureFlagOverrideContainer(options: {
  runtimeEnvironment: RuntimeEnvironment;
}): PlatformContainer {
  const database = createPlatformDatabase({
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const databaseFeatureFlags = new GetFeatureFlagsUseCase({
    featureFlags: new PostgresFeatureFlagRepository(database.client),
  });

  return composePlatformContainer({
    database,
    featureFlags: createFeatureFlagOverrideReader(databaseFeatureFlags),
    runtimeEnvironment: options.runtimeEnvironment,
  });
}
