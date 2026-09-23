import type {
  FeatureFlagReader,
  FeatureFlagSet,
} from "@eli-coach-platform/domain/feature-flag";

import { currentFeatureFlagOverrides } from "./feature-flag-override-store.server";

export function createFeatureFlagOverrideReader(
  reader: FeatureFlagReader,
): FeatureFlagReader {
  return new FeatureFlagOverrideReader(reader);
}

class FeatureFlagOverrideReader implements FeatureFlagReader {
  constructor(private readonly reader: FeatureFlagReader) {}

  async execute(): Promise<FeatureFlagSet> {
    return {
      ...(await this.reader.execute()),
      ...currentFeatureFlagOverrides(),
    };
  }
}
