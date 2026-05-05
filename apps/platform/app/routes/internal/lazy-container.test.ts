import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

const mocks = vi.hoisted(() => {
  const appMetadataController = {
    getMetadata: vi.fn(),
  };
  const featureFlagController = {
    getSnapshot: vi.fn(),
  };
  const readyzController = {
    getStatus: vi.fn(),
  };

  return {
    appMetadataController,
    featureFlagController,
    getPlatformContainer: vi.fn(() => ({
      appMetadataController,
      featureFlagController,
      readyzController,
    })),
    readyzController,
  };
});

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import * as featureFlagsRoute from "./api.feature-flags";
import * as metadataRoute from "./api.meta";
import * as readyzRoute from "./readyz";

const importTimePlatformContainerCallCount = mocks.getPlatformContainer.mock.calls.length;

describe("internal routes", () => {
  beforeEach(() => {
    mocks.getPlatformContainer.mockClear();
    mocks.appMetadataController.getMetadata.mockReset();
    mocks.featureFlagController.getSnapshot.mockReset();
    mocks.readyzController.getStatus.mockReset();
  });

  it("does not resolve runtime services when route modules are imported", () => {
    expect(importTimePlatformContainerCallCount).toBe(0);
  });

  it("resolves app metadata at request time", async () => {
    const response = Response.json({
      appName: "eli-coach-platform",
      environment: "test",
      version: "dev",
    });
    mocks.appMetadataController.getMetadata.mockResolvedValue(response);

    await expect(metadataRoute.loader()).resolves.toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.appMetadataController.getMetadata).toHaveBeenCalledTimes(1);
  });

  it("resolves readiness status at request time", async () => {
    const response = Response.json({ status: "ok" });
    mocks.readyzController.getStatus.mockReturnValue(response);

    await expect(readyzRoute.loader()).resolves.toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.readyzController.getStatus).toHaveBeenCalledTimes(1);
  });

  it("resolves feature flags at request time", async () => {
    const response = Response.json({ values: { WAITLIST_MODE: true } });
    mocks.featureFlagController.getSnapshot.mockResolvedValue(response);

    await expect(
      featureFlagsRoute.loader({} as LoaderFunctionArgs),
    ).resolves.toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.featureFlagController.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not resolve feature flags for unsupported methods", async () => {
    const response = await featureFlagsRoute.action({} as ActionFunctionArgs);

    expect(response.status).toBe(405);
    expect(mocks.getPlatformContainer).not.toHaveBeenCalled();
    expect(mocks.featureFlagController.getSnapshot).not.toHaveBeenCalled();
  });
});
