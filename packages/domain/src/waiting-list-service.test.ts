import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "./feature-flags";
import { WaitingListService } from "./waiting-list";

describe("WaitingListService", () => {
  it("returns a disabled waitlist only when WAITLIST_MODE is explicitly false", async () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockResolvedValue({ WAITLIST_MODE: false }),
      }),
    );

    const waitlist = await service.getWaitlist();

    expect(waitlist).toEqual({
      enabled: false,
      prospects: [],
    });
  });

  it("returns an enabled waitlist when WAITLIST_MODE is true", async () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
      }),
    );

    const waitlist = await service.getWaitlist();

    expect(waitlist).toEqual({
      enabled: true,
      prospects: [],
    });
  });

  it("defaults to an enabled waitlist when WAITLIST_MODE is missing", async () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockResolvedValue({}),
      }),
    );

    const waitlist = await service.getWaitlist();

    expect(waitlist).toEqual({
      enabled: true,
      prospects: [],
    });
  });

  it("defaults to an enabled waitlist when feature flags cannot be read", async () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockRejectedValue(new Error("database unavailable")),
      }),
    );

    const waitlist = await service.getWaitlist();

    expect(waitlist).toEqual({
      enabled: true,
      prospects: [],
    });
  });
});

function createFeatureFlagReader(options: {
  readFeatureFlags: FeatureFlagReader["getFeatureFlags"];
}): FeatureFlagReader {
  return {
    getFeatureFlags: options.readFeatureFlags,
  };
}
