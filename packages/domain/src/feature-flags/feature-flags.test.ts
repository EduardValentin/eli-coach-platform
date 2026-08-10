import { FeatureFlagService, type FeatureFlagRepository } from "./index";
import { describe, expect, it, vi } from "vitest";

describe("FeatureFlagService", () => {
  it("returns the stored feature flag set", async () => {
    const repository: FeatureFlagRepository = {
      listAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: "CLIENT_PORTAL",
          enabled: true,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };
    const service = new FeatureFlagService(repository);

    await expect(service.getFeatureFlags({ userId: "user-123" })).resolves.toEqual({
      CLIENT_PORTAL: true,
    });
  });

  it("returns an empty feature flag set when storage has no rows", async () => {
    const repository: FeatureFlagRepository = {
      listAll: vi.fn().mockResolvedValue([]),
    };
    const service = new FeatureFlagService(repository);

    await expect(service.getFeatureFlags({})).resolves.toEqual({});
  });
});
