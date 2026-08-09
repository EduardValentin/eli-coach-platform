import { featureFlagSnapshotSchema } from "@eli-coach-platform/contracts";
import type { FeatureFlagReader } from "@eli-coach-platform/domain";

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
