import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReaderPort } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import { FeatureFlagOverrideReaderAdapter } from "~/bounded-contexts/operations/feature-flags/adapters/outbound/overrides/feature-flag-override-reader-adapter.server";
import { runWithFeatureFlagOverrides } from "~/bounded-contexts/operations/feature-flags/adapters/outbound/overrides/feature-flag-override-store.server";

describe("feature flag override reader", () => {
  it("overlays the request's overrides on the database flags", async () => {
    // arrange
    const featureFlagReaderPort: FeatureFlagReaderPort = {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    };
    const featureFlagOverrideReaderAdapter =
      new FeatureFlagOverrideReaderAdapter(featureFlagReaderPort);

    // act
    const flags = await runWithFeatureFlagOverrides(
      { WAITLIST_MODE: false },
      () => featureFlagOverrideReaderAdapter.execute(),
    );

    // assert
    expect(flags).toEqual({ WAITLIST_MODE: false });
  });

  it("answers the database flags outside a request", async () => {
    // arrange
    const featureFlagReaderPort: FeatureFlagReaderPort = {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    };
    const featureFlagOverrideReaderAdapter =
      new FeatureFlagOverrideReaderAdapter(featureFlagReaderPort);

    // act
    const flags = await featureFlagOverrideReaderAdapter.execute();

    // assert
    expect(flags).toEqual({ WAITLIST_MODE: true });
  });

  it("does not mask a database read failure", async () => {
    // arrange
    const failure = new Error("database unavailable");
    const featureFlagReaderPort: FeatureFlagReaderPort = {
      execute: vi.fn().mockRejectedValue(failure),
    };
    const featureFlagOverrideReaderAdapter =
      new FeatureFlagOverrideReaderAdapter(featureFlagReaderPort);

    // act
    const result = runWithFeatureFlagOverrides({ WAITLIST_MODE: false }, () =>
      featureFlagOverrideReaderAdapter.execute(),
    );

    // assert
    await expect(result).rejects.toBe(failure);
  });
});
