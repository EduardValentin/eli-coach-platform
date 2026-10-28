import { describe, expect, it } from "vitest";

import { WAITLIST_MODE_FEATURE_FLAG } from "~/bounded-contexts/operations/public/feature-flags";

import { createFeatureFlagsFacade } from "./feature-flags.server";

describe("createFeatureFlagsFacade", () => {
  it("treats a flag that was never stored as off", async () => {
    // arrange
    const featureFlags = createFeatureFlagsFacade({
      execute: async () => ({}),
    });

    // act
    const on = await featureFlags.isOn(WAITLIST_MODE_FEATURE_FLAG);

    // assert
    expect(on).toBe(false);
  });
});
