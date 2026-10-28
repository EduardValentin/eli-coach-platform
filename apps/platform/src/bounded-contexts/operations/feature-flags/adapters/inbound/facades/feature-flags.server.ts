import type { FeatureFlagReader } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { FeatureFlagsFacade } from "~/bounded-contexts/operations/public/feature-flags";

export function createFeatureFlagsFacade(
  reader: FeatureFlagReader,
): FeatureFlagsFacade {
  return { read: () => reader.execute() };
}
