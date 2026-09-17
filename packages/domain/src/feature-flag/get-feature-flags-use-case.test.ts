import { describe, expect, it, vi } from "vitest";
import { GetFeatureFlagsUseCase } from "./get-feature-flags-use-case";
import { FeatureFlag } from "./feature-flag";
import type { FeatureFlags } from "./feature-flags";

describe("GetFeatureFlagsUseCase", () => {
  it("returns the stored feature flag set", async () => {
    // arrange
    const createdAt = new Date("2026-01-01");
    const updatedAt = new Date("2026-01-02");
    const repository: FeatureFlags = {
      listAll: vi.fn().mockResolvedValue([
        FeatureFlag.reconstitute({
          id: 1,
          name: "CLIENT_PORTAL",
          enabled: true,
          description: null,
          createdAt,
          updatedAt,
        }),
      ]),
    };
    const useCase = new GetFeatureFlagsUseCase({ featureFlags: repository });

    // act
    const result = await useCase.execute();

    // assert
    expect(result).toEqual({
      CLIENT_PORTAL: true,
    });
  });

  it("returns an empty feature flag set when storage has no rows", async () => {
    // arrange
    const repository: FeatureFlags = {
      listAll: vi.fn().mockResolvedValue([]),
    };
    const useCase = new GetFeatureFlagsUseCase({ featureFlags: repository });

    // act
    const result = await useCase.execute();

    // assert
    expect(result).toEqual({});
  });
});
