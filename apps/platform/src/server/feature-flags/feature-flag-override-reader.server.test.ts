import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import { createFeatureFlagOverrideReader } from "~/server/feature-flags/feature-flag-override-reader.server";

describe("feature flag override reader", () => {
  it("overlays a request value without changing the database reader", async () => {
    // arrange
    const databaseReader: FeatureFlagReader = {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    };
    const reader = createFeatureFlagOverrideReader(databaseReader);

    // act
    const flags = await reader.execute({
      overrides: { WAITLIST_MODE: false },
    });

    // assert
    expect(flags).toEqual({ WAITLIST_MODE: false });
    expect(databaseReader.execute).toHaveBeenCalledWith();
  });

  it("does not mask a database read failure", async () => {
    // arrange
    const failure = new Error("database unavailable");
    const databaseReader: FeatureFlagReader = {
      execute: vi.fn().mockRejectedValue(failure),
    };
    const reader = createFeatureFlagOverrideReader(databaseReader);

    // act
    const result = reader.execute({ overrides: { WAITLIST_MODE: false } });

    // assert
    await expect(result).rejects.toBe(failure);
  });
});
