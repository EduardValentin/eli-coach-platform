import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "./feature-flags";
import { WaitingListService } from "./waiting-list";

describe("WaitingListService", () => {
  it("returns normal mode only when WAITLIST_MODE is explicitly false", () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockResolvedValue({ WAITLIST_MODE: false }),
      }),
    );

    const launchMode = service.getLaunchMode();

    return expect(launchMode).resolves.toBe("normal");
  });

  it("defaults to waitlist mode when WAITLIST_MODE is true", () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
      }),
    );

    const launchMode = service.getLaunchMode();

    return expect(launchMode).resolves.toBe("waitlist");
  });

  it("defaults to waitlist mode when WAITLIST_MODE is missing", () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockResolvedValue({}),
      }),
    );

    const launchMode = service.getLaunchMode();

    return expect(launchMode).resolves.toBe("waitlist");
  });

  it("defaults to waitlist mode when feature flags cannot be read", () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockRejectedValue(new Error("database unavailable")),
      }),
    );

    const launchMode = service.getLaunchMode();

    return expect(launchMode).resolves.toBe("waitlist");
  });
});

function createFeatureFlagReader(options: {
  readFeatureFlags: FeatureFlagReader["getFeatureFlags"];
}): FeatureFlagReader {
  return {
    getFeatureFlags: options.readFeatureFlags,
  };
}
