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

let overrideMiddleware: MiddlewareFunction<Response> | null = null;
let overrideContainer: PlatformContainer | null = null;

export const featureFlagOverrideMiddleware: MiddlewareFunction<Response> = (
  args,
  next,
) => {
  const environment = getRuntimeEnvironment();

  if (!featureFlagOverridesAllowed(environment)) {
    return next();
  }

  overrideMiddleware ??= createFeatureFlagOverrideMiddleware({
    appBasePath: environment.APP_BASE_PATH,
  });

  return overrideMiddleware(args, next);
};

export function getFeatureFlagOverrideContainer(): PlatformContainer {
  const environment = getRuntimeEnvironment();

  if (!featureFlagOverridesAllowed(environment)) {
    return getPlatformContainer();
  }

  overrideContainer ??= createFeatureFlagOverrideContainer(environment);

  return overrideContainer;
}

function featureFlagOverridesAllowed(environment: RuntimeEnvironment): boolean {
  return (
    environment.ENVIRONMENT === "local" || environment.ENVIRONMENT === "test"
  );
}

function createFeatureFlagOverrideContainer(
  runtimeEnvironment: RuntimeEnvironment,
): PlatformContainer {
  const database = createPlatformDatabase({ runtimeEnvironment });
  const databaseFeatureFlags = new GetFeatureFlagsUseCase({
    featureFlags: new PostgresFeatureFlagRepository(database.client),
  });

  return composePlatformContainer({
    database,
    featureFlags: createFeatureFlagOverrideReader(databaseFeatureFlags),
    runtimeEnvironment,
  });
}
