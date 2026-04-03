import { FeatureFlagService, type FeatureFlagRepository } from "./feature-flags";
import { describe, expect, it, vi } from "vitest";

describe("FeatureFlagService", () => {
  it("returns the stored feature flag set", async () => {
    const repository: FeatureFlagRepository = {
      listAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: "WAITLIST_MODE",
          enabled: true,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };
    const service = new FeatureFlagService(repository);

    await expect(service.getFeatureFlags({ userId: "user-123" })).resolves.toEqual({
      WAITLIST_MODE: true,
    });
  });

  it("returns false for supported flags that do not exist in storage", async () => {
    const repository: FeatureFlagRepository = {
      listAll: vi.fn().mockResolvedValue([]),
    };
    const service = new FeatureFlagService(repository);

    await expect(service.getFeatureFlags({})).resolves.toEqual({
      WAITLIST_MODE: false,
    });
  });
});
