import { FeatureFlagService, type FeatureFlagRepository } from "./feature-flags";
import { describe, expect, it, vi } from "vitest";

describe("FeatureFlagService", () => {
  it("returns the stored feature flag value", async () => {
    const repository: FeatureFlagRepository = {
      findByName: vi.fn().mockResolvedValue({
        id: 1,
        name: "WAITLIST_MODE",
        enabled: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    const service = new FeatureFlagService(repository);

    await expect(service.getFlag("WAITLIST_MODE")).resolves.toBe(true);
  });

  it("returns false when the feature flag does not exist", async () => {
    const repository: FeatureFlagRepository = {
      findByName: vi.fn().mockResolvedValue(null),
    };
    const service = new FeatureFlagService(repository);

    await expect(service.getFlag("UNKNOWN_FLAG")).resolves.toBe(false);
  });
});
