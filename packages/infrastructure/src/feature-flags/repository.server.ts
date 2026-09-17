import {
  FeatureFlag,
  type FeatureFlags,
} from "@eli-coach-platform/domain/feature-flag";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { featureFlagsTable } from "./schema.server";

export class PostgresFeatureFlagRepository implements FeatureFlags {
  constructor(private readonly database: DatabaseClient) {}

  async listAll(): Promise<FeatureFlag[]> {
    const rows = await this.database.select().from(featureFlagsTable);
    return rows.map((row) => FeatureFlag.reconstitute(row));
  }
}
