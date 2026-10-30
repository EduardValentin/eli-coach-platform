import { describe, expect, it, vi } from "vitest";
import { GetFeatureFlagsUseCase } from "./get-feature-flags-use-case";
import { FeatureFlag } from "./feature-flag";
import type { FeatureFlagsPort } from "./feature-flags-port";

describe("GetFeatureFlagsUseCase", () => {
  it("returns the stored feature flag set", async () => {
    // arrange
    const createdAt = new Date("2026-01-01");
    const updatedAt = new Date("2026-01-02");
    const featureFlagsPort: FeatureFlagsPort = {
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
    const getFeatureFlagsUseCase = new GetFeatureFlagsUseCase({
      featureFlagsPort,
    });

    // act
    const result = await getFeatureFlagsUseCase.execute();

    // assert
    expect(result).toEqual({
      CLIENT_PORTAL: true,
    });
  });

  it("returns an empty feature flag set when storage has no rows", async () => {
    // arrange
    const featureFlagsPort: FeatureFlagsPort = {
      listAll: vi.fn().mockResolvedValue([]),
    };
    const getFeatureFlagsUseCase = new GetFeatureFlagsUseCase({
      featureFlagsPort,
    });

    // act
    const result = await getFeatureFlagsUseCase.execute();

    // assert
    expect(result).toEqual({});
  });
});
