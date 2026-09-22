import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { GetFeatureFlagsUseCase } from "@eli-coach-platform/domain/feature-flag";
import { PostgresFeatureFlagRepository } from "@eli-coach-platform/infrastructure/feature-flags/server";

import { createPlatformDatabase } from "~/server/database.server";
import {
  composePlatformContainer,
  type PlatformContainer,
} from "~/server/platform-container-composition.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type { PlatformContainer } from "~/server/platform-container-composition.server";

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: {
  runtimeEnvironment: RuntimeEnvironment;
}): PlatformContainer {
  const database = createPlatformDatabase({
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const featureFlags = new GetFeatureFlagsUseCase({
    featureFlags: new PostgresFeatureFlagRepository(database.client),
  });

  return composePlatformContainer({
    database,
    featureFlags,
    runtimeEnvironment: options.runtimeEnvironment,
  });
}

export function getPlatformContainer(): PlatformContainer {
  platformContainer ??= createPlatformContainer({
    runtimeEnvironment: getRuntimeEnvironment(),
  });

  return platformContainer;
}
