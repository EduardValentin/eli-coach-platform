import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import { createFeatureFlagOverrideReader } from "~/server/feature-flag-overrides/feature-flag-override-reader.server";
import { runWithFeatureFlagOverrides } from "~/server/feature-flag-overrides/feature-flag-override-store.server";

describe("feature flag override reader", () => {
  it("overlays the request's overrides on the database flags", async () => {
    // arrange
    const databaseReader: FeatureFlagReader = {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    };
    const reader = createFeatureFlagOverrideReader(databaseReader);

    // act
    const flags = await runWithFeatureFlagOverrides(
      { WAITLIST_MODE: false },
      () => reader.execute(),
    );

    // assert
    expect(flags).toEqual({ WAITLIST_MODE: false });
  });

  it("answers the database flags outside a request", async () => {
    // arrange
    const databaseReader: FeatureFlagReader = {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    };
    const reader = createFeatureFlagOverrideReader(databaseReader);

    // act
    const flags = await reader.execute();

    // assert
    expect(flags).toEqual({ WAITLIST_MODE: true });
  });

  it("does not mask a database read failure", async () => {
    // arrange
    const failure = new Error("database unavailable");
    const databaseReader: FeatureFlagReader = {
      execute: vi.fn().mockRejectedValue(failure),
    };
    const reader = createFeatureFlagOverrideReader(databaseReader);

    // act
    const result = runWithFeatureFlagOverrides({ WAITLIST_MODE: false }, () =>
      reader.execute(),
    );

    // assert
    await expect(result).rejects.toBe(failure);
  });
});
