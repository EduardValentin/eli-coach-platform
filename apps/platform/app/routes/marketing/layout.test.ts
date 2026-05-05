import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runtimeEnvironment: {
    TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
    WAITLIST_CAP: 10,
  },
  waitlistController: {
    getSnapshot: vi.fn(),
  },
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: () => ({
    waitlistController: mocks.waitlistController,
  }),
}));

vi.mock("~/server/runtime-environment.server", () => ({
  getRuntimeEnvironment: () => mocks.runtimeEnvironment,
}));

import { loader } from "./layout";

describe("marketing layout loader", () => {
  beforeEach(() => {
    mocks.waitlistController.getSnapshot.mockReset();
  });

  it("loads the public waitlist snapshot through the controller", async () => {
    mocks.waitlistController.getSnapshot.mockResolvedValue(
      Response.json({
        enabled: false,
        cap: 10,
        spotsRemaining: 3,
      }),
    );

    await expect(loader()).resolves.toEqual({
      botDetection: {
        turnstileSiteKey: "1x00000000000000000000BB",
      },
      waitlist: {
        enabled: false,
        cap: 10,
        spotsRemaining: 3,
      },
    });
    expect(mocks.waitlistController.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("falls back to runtime config when the snapshot cannot be loaded", async () => {
    mocks.waitlistController.getSnapshot.mockRejectedValue(new Error("database unavailable"));

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
  });
});
