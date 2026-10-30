import {
  FeatureFlag,
  type FeatureFlagsPort,
} from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { featureFlagsTable } from "./schema.server";

export class PostgresFeatureFlagRepository implements FeatureFlagsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async listAll(): Promise<FeatureFlag[]> {
    const rows = await this.executor.select().from(featureFlagsTable);
    return rows.map((row) => FeatureFlag.reconstitute(row));
  }
}
