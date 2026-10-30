import { loadRuntimeEnvironment } from "~/composition-root/runtime-environment";
import { CLERK_TEST_ENVIRONMENT } from "~test-support/index";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RouterContextProvider } from "react-router";
import { afterAll, describe, expect, it, vi } from "vitest";

import { accountsContext } from "~/bounded-contexts/access/public/request-context";
import {
  checkInsContext,
  clientOnboardingContext,
  clientProfileContext,
  clientResourcesContext,
  clientsContext,
  notificationsContext,
} from "~/bounded-contexts/clients/public/request-context";
import { featureFlagsContext } from "~/bounded-contexts/operations/public/request-context";
import {
  exerciseLibraryContext,
  nutritionLibraryContext,
} from "~/bounded-contexts/programs/public/request-context";
import {
  coachingSalesContext,
  storeContext,
  waitlistContext,
} from "~/bounded-contexts/sales/public/request-context";
import {
  assessmentCallsContext,
  coachScheduleContext,
} from "~/bounded-contexts/scheduling/public/request-context";
import { createPlatformContainer } from "~/composition-root/container.server";
import { createBoundedContextMiddleware } from "~/composition-root/bounded-context-middleware.server";
import { platformContext } from "~/composition-root/guards/platform-context.server";
import { runtimeConfigContext } from "~/composition-root/guards/runtime-config-context.server";

const storeAssetRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-store-assets-bounded-context-middleware-unit-"),
);
const clientResourceRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-client-resources-bounded-context-middleware-unit-"),
);
const exerciseVideoRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-exercise-videos-bounded-context-middleware-unit-"),
);
const recipePhotoRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-recipe-photos-bounded-context-middleware-unit-"),
);

function createContainerWithoutDatabase() {
  return createPlatformContainer({
    runtimeEnvironment: loadRuntimeEnvironment({
      APP_NAME: "eli-coach-platform",
      ...CLERK_TEST_ENVIRONMENT,
      ENVIRONMENT: "local",
      MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
      NODE_ENV: "development",
      PUBLIC_APP_URL: "https://eli.example",
      STORE_ASSET_ROOT: storeAssetRoot,
      CLIENT_RESOURCE_ROOT: clientResourceRoot,
      EXERCISE_VIDEO_ROOT: exerciseVideoRoot,
      RECIPE_PHOTO_ROOT: recipePhotoRoot,
    }),
  });
}

describe("createBoundedContextMiddleware", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
    await rm(clientResourceRoot, { force: true, recursive: true });
    await rm(exerciseVideoRoot, { force: true, recursive: true });
    await rm(recipePhotoRoot, { force: true, recursive: true });
  });

  it("publishes every component of the container on the request context and continues", async () => {
    // arrange
    const container = createContainerWithoutDatabase();
    const getContainer = vi.fn(() => container);
    const context = new RouterContextProvider();
    const next = vi.fn().mockResolvedValue(new Response("ok"));

    // act
    const response = await createBoundedContextMiddleware(getContainer)(
      {
        context,
        request: new Request("http://localhost/"),
        params: {},
      } as never,
      next,
    );

    // assert
    expect(getContainer).toHaveBeenCalledTimes(1);
    expect(context.get(featureFlagsContext)).toBeDefined();
    expect(context.get(accountsContext)).toBeDefined();
    expect(context.get(coachScheduleContext)).toBeDefined();
    expect(context.get(assessmentCallsContext)).toBeDefined();
    expect(context.get(clientsContext)).toBeDefined();
    expect(context.get(clientProfileContext)).toBeDefined();
    expect(context.get(clientOnboardingContext)).toBeDefined();
    expect(context.get(clientResourcesContext)).toBeDefined();
    expect(context.get(notificationsContext)).toBeDefined();
    expect(context.get(checkInsContext)).toBeDefined();
    expect(context.get(exerciseLibraryContext)).toBeDefined();
    expect(context.get(nutritionLibraryContext)).toBeDefined();
    expect(context.get(storeContext)).toBeDefined();
    expect(context.get(waitlistContext)).toBeDefined();
    expect(context.get(coachingSalesContext)).toBeDefined();
    expect(context.get(platformContext)).toEqual({
      appMetadataController: container.platform.appMetadataController,
      readyzController: container.platform.readyzController,
    });
    expect(context.get(runtimeConfigContext)).toEqual({
      appBasePath: container.platform.appBasePath,
      botDetection: container.platform.botDetection,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(response).toBeInstanceOf(Response);
  });
});
