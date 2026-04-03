import type { FeatureFlagRepository, PersistedFeatureFlag } from "@eli-coach-platform/domain";
import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../database-client";
import { featureFlagsTable } from "../schema";

export class PostgresFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private readonly database: DatabaseClient) {}

  async findByName(name: string): Promise<PersistedFeatureFlag | null> {
    const featureFlag = await this.database.query.featureFlagsTable.findFirst({
      where: eq(featureFlagsTable.name, name),
    });

    if (!featureFlag) {
      return null;
    }

    return featureFlag;
  }
}
