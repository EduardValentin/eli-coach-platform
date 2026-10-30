import type { FeatureFlagReaderPort } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";

import { featureFlagSnapshotSchema } from "./feature-flags-contract";

export class FeatureFlagController {
  constructor(private readonly getFeatureFlags: FeatureFlagReaderPort) {}

  async getSnapshot(): Promise<Response> {
    const featureFlags = await this.getFeatureFlags.execute();
    const responseBody = featureFlagSnapshotSchema.parse({
      flags: featureFlags,
    });

    return Response.json(responseBody);
  }
}
