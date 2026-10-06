import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import pg from "pg";

import { requireEnv } from "./env";
import { repoRootDirectory } from "./repo-paths";

const RESOURCES_TABLE = "app.client_resources";
const HIDDEN_RESOURCES_TABLE = "client_resources_outage";

function tableOwnerPool(): pg.Pool {
  const postgres = parseEnv(
    readFileSync(resolve(repoRootDirectory, ".env.postgres"), "utf8"),
  );

  return new pg.Pool({
    host: requireEnv("DATABASE_HOST"),
    port: Number(requireEnv("DATABASE_PORT")),
    database: requireEnv("DATABASE_NAME"),
    user: postgres.APP_DB_MIGRATION_USER,
    password: postgres.APP_DB_MIGRATION_PASSWORD,
  });
}

export class ClientResourcesOutage {
  readonly #pool = tableOwnerPool();
  #ongoing = false;

  async begin(): Promise<void> {
    await this.#pool.query(
      `ALTER TABLE ${RESOURCES_TABLE} RENAME TO ${HIDDEN_RESOURCES_TABLE}`,
    );
    this.#ongoing = true;
  }

  async end(): Promise<void> {
    await this.#pool.query(
      `ALTER TABLE app.${HIDDEN_RESOURCES_TABLE} RENAME TO client_resources`,
    );
    this.#ongoing = false;
  }

  async dispose(): Promise<void> {
    if (this.#ongoing) await this.end();
    await this.#pool.end();
  }
}
