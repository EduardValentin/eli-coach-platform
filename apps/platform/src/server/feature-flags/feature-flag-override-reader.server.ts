import type {
  FeatureFlagEvaluation,
  FeatureFlagReader,
  FeatureFlagSet,
} from "@eli-coach-platform/domain/feature-flag";

export function createFeatureFlagOverrideReader(
  reader: FeatureFlagReader,
): FeatureFlagReader {
  return new FeatureFlagOverrideReader(reader);
}

class FeatureFlagOverrideReader implements FeatureFlagReader {
  constructor(private readonly reader: FeatureFlagReader) {}

  async execute(evaluation?: FeatureFlagEvaluation): Promise<FeatureFlagSet> {
    return {
      ...(await this.reader.execute()),
      ...evaluation?.overrides,
    };
  }
}
