import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { QueryResultRow } from "pg";

import { loadIntegrationTestEnvironment } from "./runtime-environment";
import {
  PostgresTestEnvironment,
  type ExecuteSqlOptions,
  type QueryRowsOptions,
} from "./postgres-test-environment";

type MigrationJournal = {
  entries: { tag: string }[];
};

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(currentDirectory, "../../..");
const migrationsFolderPath = resolve(rootDirectory, "apps/platform/db/drizzle");
const journalFileName = "_journal.json";

export class MigrationTestDatabase {
  private readonly integrationTestEnvironment =
    loadIntegrationTestEnvironment();
  private readonly environment = new PostgresTestEnvironment({
    appName: this.integrationTestEnvironment.runtimeEnvironment.APP_NAME,
    bootstrapSqlPath: resolve(rootDirectory, "packages/db/sql/bootstrap.sql"),
    databaseBootstrapEnvironment:
      this.integrationTestEnvironment.databaseBootstrapEnvironment,
    initScriptPath: resolve(
      rootDirectory,
      "packages/db/scripts/docker-init-bootstrap.sh",
    ),
    workspaceRootPath: rootDirectory,
  });
  private partialMigrationsFolderPath: string | null = null;

  async startMigratedThrough(lastAppliedTag: string): Promise<void> {
    this.partialMigrationsFolderPath =
      await createMigrationsFolderThrough(lastAppliedTag);
    await this.environment.startWithoutApplicationMigrations();
    await this.environment.applyApplicationMigrations({
      migrationsFolderOverridePath: this.partialMigrationsFolderPath,
    });
  }

  async applyRemainingMigrations(): Promise<void> {
    await this.environment.applyApplicationMigrations();
  }

  async executeSql(options: ExecuteSqlOptions): Promise<void> {
    await this.environment.executeSql(options);
  }

  async queryRows<T extends QueryResultRow>(
    options: QueryRowsOptions,
  ): Promise<T[]> {
    return this.environment.queryRows<T>(options);
  }

  async stop(): Promise<void> {
    try {
      await this.environment.stop();
    } finally {
      if (this.partialMigrationsFolderPath) {
        await rm(this.partialMigrationsFolderPath, {
          force: true,
          recursive: true,
        });
        this.partialMigrationsFolderPath = null;
      }
    }
  }
}

async function createMigrationsFolderThrough(
  lastAppliedTag: string,
): Promise<string> {
  const journal = JSON.parse(
    await readFile(join(migrationsFolderPath, "meta", journalFileName), "utf8"),
  ) as MigrationJournal;
  const lastAppliedIndex = journal.entries.findIndex(
    (entry) => entry.tag === lastAppliedTag,
  );

  if (lastAppliedIndex < 0) {
    throw new Error(
      `The migration journal does not contain ${lastAppliedTag}.`,
    );
  }

  const partialJournal = {
    ...journal,
    entries: journal.entries.slice(0, lastAppliedIndex + 1),
  };
  const folderPath = await mkdtemp(join(tmpdir(), "eli-coach-migrations-"));

  await mkdir(join(folderPath, "meta"));
  await writeFile(
    join(folderPath, "meta", journalFileName),
    `${JSON.stringify(partialJournal, null, 2)}\n`,
  );
  await Promise.all(
    partialJournal.entries.map((entry) =>
      copyFile(
        join(migrationsFolderPath, `${entry.tag}.sql`),
        join(folderPath, `${entry.tag}.sql`),
      ),
    ),
  );

  return folderPath;
}
