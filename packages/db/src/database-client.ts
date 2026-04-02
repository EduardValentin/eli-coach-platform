import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "./schema";

export type DatabaseClient = NodePgDatabase<typeof schema>;

export function createDatabaseClient(pool: Pool): DatabaseClient {
  return drizzle({
    client: pool,
    schema,
  });
}
