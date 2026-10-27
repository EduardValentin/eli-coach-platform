import type { FeatureFlagReader } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";

import { currentFeatureFlagOverrides } from "./feature-flag-override-store.server";

export function createFeatureFlagOverrideReader(
  storedFlags: FeatureFlagReader,
): FeatureFlagReader {
  return {
    async execute() {
      return {
        ...(await storedFlags.execute()),
        ...currentFeatureFlagOverrides(),
      };
    },
  };
}
