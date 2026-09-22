import type {
  FeatureFlagEvaluation,
  FeatureFlagReader,
} from "@eli-coach-platform/domain/feature-flag";

import { featureFlagSnapshotSchema } from "./feature-flags-contract";

export class FeatureFlagController {
  constructor(private readonly getFeatureFlags: FeatureFlagReader) {}

  async getSnapshot(evaluation?: FeatureFlagEvaluation): Promise<Response> {
    const featureFlags = await this.getFeatureFlags.execute(evaluation);
    const responseBody = featureFlagSnapshotSchema.parse({
      flags: featureFlags,
    });

    return Response.json(responseBody);
  }
}
