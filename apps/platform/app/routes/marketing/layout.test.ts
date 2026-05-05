import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformContainer: vi.fn(() => ({
    waitlistController: {
      getSnapshot: vi.fn(),
    },
  })),
  runtimeEnvironment: {
    TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
    WAITLIST_CAP: 10,
  },
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

vi.mock("~/server/runtime-environment.server", () => ({
  getRuntimeEnvironment: () => mocks.runtimeEnvironment,
}));

import { loader } from "./layout";

const importTimePlatformContainerCallCount = mocks.getPlatformContainer.mock.calls.length;

describe("marketing layout loader", () => {
  beforeEach(() => {
    mocks.getPlatformContainer.mockClear();
  });

  it("does not resolve runtime services when the route module is imported", () => {
    expect(importTimePlatformContainerCallCount).toBe(0);
  });

  it("loads the static public shell configuration without touching runtime services", async () => {
    await expect(loader()).resolves.toEqual({
      botDetection: {
        turnstileSiteKey: "1x00000000000000000000BB",
      },
      waitlist: {
        enabled: true,
        cap: 10,
        spotsRemaining: null,
      },
    });
    expect(mocks.getPlatformContainer).not.toHaveBeenCalled();
  });
});
