import pg from "pg";

import { requireEnv } from "./env";

export function createE2eDatabasePool(): pg.Pool {
  return new pg.Pool({
    host: requireEnv("DATABASE_HOST"),
    port: Number(requireEnv("DATABASE_PORT")),
    database: requireEnv("DATABASE_NAME"),
    user: requireEnv("DATABASE_USER"),
    password: requireEnv("DATABASE_PASSWORD"),
  });
}
