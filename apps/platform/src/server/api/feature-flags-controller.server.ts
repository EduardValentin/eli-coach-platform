import type { FeatureFlagReader } from "@eli-coach-platform/domain";

import { featureFlagSnapshotSchema } from "./feature-flags-contract";

export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagReader) {}

  async getSnapshot(): Promise<Response> {
    const featureFlags = await this.featureFlagService.getFeatureFlags({});
    const responseBody = featureFlagSnapshotSchema.parse({
      flags: featureFlags,
    });

    return Response.json(responseBody);
  }
}
