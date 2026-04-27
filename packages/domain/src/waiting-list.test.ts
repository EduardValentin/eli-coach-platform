import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "./feature-flags";
import {
  resolveWaitingListLaunchMode,
  WaitingListService,
  WAITLIST_MODE_FEATURE_FLAG,
} from "./waiting-list";

describe("resolveWaitingListLaunchMode", () => {
  it("returns normal mode only when WAITLIST_MODE is explicitly false", () => {
    const featureFlags = {
      [WAITLIST_MODE_FEATURE_FLAG]: false,
    };

    const launchMode = resolveWaitingListLaunchMode(featureFlags);

    expect(launchMode).toBe("normal");
  });

  it("defaults to waitlist mode when WAITLIST_MODE is true", () => {
    const featureFlags = {
      [WAITLIST_MODE_FEATURE_FLAG]: true,
    };

    const launchMode = resolveWaitingListLaunchMode(featureFlags);

    expect(launchMode).toBe("waitlist");
  });

  it("defaults to waitlist mode when WAITLIST_MODE is missing or unavailable", () => {
    const missingLaunchMode = resolveWaitingListLaunchMode({});
    const unavailableLaunchMode = resolveWaitingListLaunchMode(null);

    expect(missingLaunchMode).toBe("waitlist");
    expect(unavailableLaunchMode).toBe("waitlist");
  });
});

describe("WaitingListService", () => {
  it("defaults to waitlist mode when feature flags cannot be read", async () => {
    const service = new WaitingListService(
      createFeatureFlagReader({
        readFeatureFlags: vi.fn().mockRejectedValue(new Error("database unavailable")),
      }),
    );

    const launchMode = await service.getLaunchMode();

    expect(launchMode).toBe("waitlist");
  });
});

function createFeatureFlagReader(options: {
  readFeatureFlags: FeatureFlagReader["getFeatureFlags"];
}): FeatureFlagReader {
  return {
    getFeatureFlags: options.readFeatureFlags,
  };
}
