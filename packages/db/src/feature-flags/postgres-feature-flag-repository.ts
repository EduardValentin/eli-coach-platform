import type { FeatureFlagRepository, PersistedFeatureFlag } from "@eli-coach-platform/domain";
import type { DatabaseClient } from "../database-client";

export class PostgresFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private readonly database: DatabaseClient) {}

  async listAll(): Promise<PersistedFeatureFlag[]> {
    return this.database.query.featureFlagsTable.findMany();
  }
}
