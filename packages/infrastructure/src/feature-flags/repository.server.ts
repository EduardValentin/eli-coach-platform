import type { FeatureFlagRepository, PersistedFeatureFlag } from "@eli-coach-platform/domain";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { featureFlagsTable } from "./schema.server";

export class PostgresFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private readonly database: DatabaseClient) {}

  async listAll(): Promise<PersistedFeatureFlag[]> {
    return this.database.select().from(featureFlagsTable);
  }
}
