import { describe, expect, it, vi } from "vitest";

import type { PlatformControllers } from "~/composition-root/platform-composition.server";
import { platformContext } from "~/composition-root/guards/platform-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import * as metadataRoute from "./meta/meta";
import * as readyzRoute from "./readyz/readyz";

function platformArgs(controllers: Partial<PlatformControllers>) {
  return createRequestArgs({
    contexts: [
      contextEntry(platformContext, controllers as PlatformControllers),
    ],
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
});
