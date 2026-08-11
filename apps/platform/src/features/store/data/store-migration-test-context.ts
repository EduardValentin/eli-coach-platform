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
import { loadIntegrationTestEnvironment } from "~test-support/integration-test-environment";
import {
  PostgresTestEnvironment,
  type QueryRowsOptions,
} from "~test-support/postgres-test-environment";

type MigrationJournal = {
  version: string;
  dialect: string;
  entries: MigrationJournalEntry[];
};

type MigrationJournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRootPath = resolve(currentDirectory, "../../../../../..");
const applicationMigrationsFolderPath = resolve(
  workspaceRootPath,
  "apps/platform/db/drizzle",
);
const bootstrapInitScriptPath = resolve(
  workspaceRootPath,
  "packages/db/scripts/docker-init-bootstrap.sh",
);
const bootstrapSqlPath = resolve(
  workspaceRootPath,
  "packages/db/sql/bootstrap.sql",
);
const lastPreStoreMigrationTag = "0008_waitlist_consent_evidence";

export class StoreMigrationTestContext {
  private readonly integrationTestEnvironment =
    loadIntegrationTestEnvironment();
  private readonly databaseEnvironment = new PostgresTestEnvironment({
    appName: this.integrationTestEnvironment.runtimeEnvironment.APP_NAME,
    bootstrapSqlPath,
    databaseBootstrapEnvironment:
      this.integrationTestEnvironment.databaseBootstrapEnvironment,
    initScriptPath: bootstrapInitScriptPath,
    workspaceRootPath,
  });
  private preStoreMigrationsFolderPath: string | null = null;

  async startAtLastPreStoreMigration(): Promise<void> {
    await this.startAtMigration(lastPreStoreMigrationTag);
  }

  async startAtMigration(tag: string): Promise<void> {
    this.preStoreMigrationsFolderPath =
      await this.createMigrationsFolderThrough(tag);
    await this.databaseEnvironment.startWithoutApplicationMigrations();
    await this.databaseEnvironment.applyApplicationMigrations({
      migrationsFolderOverridePath: this.preStoreMigrationsFolderPath,
    });
  }

  async applyCurrentApplicationMigrations(): Promise<void> {
    await this.databaseEnvironment.applyApplicationMigrations();
  }

  async queryRows<T extends QueryResultRow>(
    options: QueryRowsOptions,
  ): Promise<T[]> {
    return this.databaseEnvironment.queryRows<T>(options);
  }

  async stop(): Promise<void> {
    try {
      await this.databaseEnvironment.stop();
    } finally {
      if (this.preStoreMigrationsFolderPath) {
        await rm(this.preStoreMigrationsFolderPath, {
          force: true,
          recursive: true,
        });
        this.preStoreMigrationsFolderPath = null;
      }
    }
  }

  private async createMigrationsFolderThrough(
    tag: string,
  ): Promise<string> {
    const temporaryFolderPath = await mkdtemp(
      join(tmpdir(), "eli-coach-store-migrations-"),
    );

    try {
      const temporaryMetadataFolderPath = join(temporaryFolderPath, "meta");
      const journalFileName = "_journal.json";
      const applicationJournal = JSON.parse(
        await readFile(
          join(
            applicationMigrationsFolderPath,
            "meta",
            journalFileName,
          ),
          "utf8",
        ),
      ) as MigrationJournal;
      const finalMigrationIndex = applicationJournal.entries.findIndex(
        (entry) => entry.tag === tag,
      );

      if (finalMigrationIndex < 0) {
        throw new Error(
          `Application migration journal does not contain ${tag}.`,
        );
      }

      const preStoreJournal = {
        ...applicationJournal,
        entries: applicationJournal.entries.slice(
          0,
          finalMigrationIndex + 1,
        ),
      } satisfies MigrationJournal;

      await mkdir(temporaryMetadataFolderPath);
      await writeFile(
        join(temporaryMetadataFolderPath, journalFileName),
        `${JSON.stringify(preStoreJournal, null, 2)}\n`,
      );
      await Promise.all(
        preStoreJournal.entries.map(async (entry) => {
          const migrationFileName = `${entry.tag}.sql`;

          await copyFile(
            join(applicationMigrationsFolderPath, migrationFileName),
            join(temporaryFolderPath, migrationFileName),
          );
        }),
      );

      return temporaryFolderPath;
    } catch (error) {
      await rm(temporaryFolderPath, {
        force: true,
        recursive: true,
      });
      throw error;
    }
  }
}
