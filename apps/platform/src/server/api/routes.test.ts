import { describe, expect, it, vi } from "vitest";

import type { PlatformControllers } from "~/server/platform-composition.server";
import { platformContext } from "~/server/guards/platform-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import * as featureFlagsRoute from "./feature-flags";
import * as metadataRoute from "./meta";
import * as readyzRoute from "./readyz";

function platformArgs(
  controllers: Partial<PlatformControllers>,
  request?: Request,
) {
  return createRequestArgs({
    contexts: [
      contextEntry(platformContext, controllers as PlatformControllers),
    ],
    request,
  });
}

describe("internal routes", () => {
  it("answers app metadata from the platform context", async () => {
    // arrange
    const response = Response.json({
      appName: "eli-coach-platform",
      environment: "test",
      version: "dev",
    });
    const getMetadata = vi.fn().mockResolvedValue(response);

    // act
    const loaded = metadataRoute.loader(
      platformArgs({ metadata: { getMetadata } as never }),
    );

    // assert
    await expect(loaded).resolves.toBe(response);
    expect(getMetadata).toHaveBeenCalledTimes(1);
  });

  it("answers readiness status from the platform context", async () => {
    // arrange
    const response = Response.json({ status: "ok" });
    const getStatus = vi.fn().mockReturnValue(response);

    // act
    const loaded = readyzRoute.loader(
      platformArgs({ readyz: { getStatus } as never }),
    );

    // assert
    await expect(loaded).resolves.toBe(response);
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it("answers feature flags from the platform context", async () => {
    // arrange
    const response = Response.json({ values: { CLIENT_PORTAL: true } });
    const getSnapshot = vi.fn().mockResolvedValue(response);

    // act
    const loaded = featureFlagsRoute.loader(
      platformArgs({ featureFlags: { getSnapshot } as never }),
    );

    // assert
    await expect(loaded).resolves.toBe(response);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("rejects a feature flag write without reading the platform context", async () => {
    // arrange
    const getSnapshot = vi.fn();
    const args = platformArgs(
      { featureFlags: { getSnapshot } as never },
      new Request("https://eli.example/api/feature-flags", { method: "POST" }),
    );

    // act
    const response = await featureFlagsRoute.action(args);

    // assert
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
    expect(getSnapshot).not.toHaveBeenCalled();
  });
});
