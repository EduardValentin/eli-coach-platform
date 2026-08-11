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
import { loadIntegrationTestEnvironment } from "~test-support/support/integration-test-environment";
import {
  PostgresTestEnvironment,
  type ExecuteSqlOptions,
  type QueryRowsOptions,
} from "~test-support/support/postgres-test-environment";

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
const applicationMigrationsFolderPath = resolve(workspaceRootPath, "apps/platform/db/drizzle");
const bootstrapInitScriptPath = resolve(
  workspaceRootPath,
  "packages/db/scripts/docker-init-bootstrap.sh",
);
const bootstrapSqlPath = resolve(workspaceRootPath, "packages/db/sql/bootstrap.sql");
const lastPreConsentMigrationTag = "0007_violet_darkhawk";

export class WaitlistMigrationTestContext {
  private readonly integrationTestEnvironment = loadIntegrationTestEnvironment();
  private readonly databaseEnvironment = new PostgresTestEnvironment({
    appName: this.integrationTestEnvironment.runtimeEnvironment.APP_NAME,
    bootstrapSqlPath,
    databaseBootstrapEnvironment: this.integrationTestEnvironment.databaseBootstrapEnvironment,
    initScriptPath: bootstrapInitScriptPath,
    workspaceRootPath,
  });
  private preConsentMigrationsFolderPath: string | null = null;

  async startAtLastPreConsentMigration(): Promise<void> {
    this.preConsentMigrationsFolderPath =
      await this.createPreConsentMigrationsFolder();
    await this.databaseEnvironment.startWithoutApplicationMigrations();
    await this.databaseEnvironment.applyApplicationMigrations({
      migrationsFolderOverridePath: this.preConsentMigrationsFolderPath,
    });
  }

  async applyCurrentApplicationMigrations(): Promise<void> {
    await this.databaseEnvironment.applyApplicationMigrations();
  }

  async executeSql(options: ExecuteSqlOptions): Promise<void> {
    await this.databaseEnvironment.executeSql(options);
  }

  async queryRows<T extends QueryResultRow>(options: QueryRowsOptions): Promise<T[]> {
    return this.databaseEnvironment.queryRows<T>(options);
  }

  async stop(): Promise<void> {
    try {
      await this.databaseEnvironment.stop();
    } finally {
      await this.removePreConsentMigrationsFolder();
    }
  }

  private async removePreConsentMigrationsFolder(): Promise<void> {
    if (this.preConsentMigrationsFolderPath) {
      await removeTemporaryMigrationFolder(
        this.preConsentMigrationsFolderPath,
      );
      this.preConsentMigrationsFolderPath = null;
    }
  }

  private async createPreConsentMigrationsFolder(): Promise<string> {
    const temporaryFolderPath = await mkdtemp(
      join(tmpdir(), "eli-coach-waitlist-migrations-"),
    );

    try {
      await this.populatePreConsentMigrationsFolder(temporaryFolderPath);

      return temporaryFolderPath;
    } catch (creationError) {
      await removeTemporaryMigrationFolder(temporaryFolderPath);
      throw creationError;
    }
  }

  private async populatePreConsentMigrationsFolder(
    temporaryFolderPath: string,
  ): Promise<void> {
    const temporaryMetadataFolderPath = join(temporaryFolderPath, "meta");
    const journalFileName = "_journal.json";
    const applicationJournalPath = join(
      applicationMigrationsFolderPath,
      "meta",
      journalFileName,
    );
    const applicationJournal = JSON.parse(
      await readFile(applicationJournalPath, "utf8"),
    ) as MigrationJournal;
    const lastPreConsentMigrationIndex = applicationJournal.entries.findIndex(
      (entry) => entry.tag === lastPreConsentMigrationTag,
    );

    if (lastPreConsentMigrationIndex < 0) {
      throw new Error(
        `Application migration journal does not contain ${lastPreConsentMigrationTag}.`,
      );
    }

    const preConsentJournal = {
      ...applicationJournal,
      entries: applicationJournal.entries.slice(
        0,
        lastPreConsentMigrationIndex + 1,
      ),
    } satisfies MigrationJournal;

    await mkdir(temporaryMetadataFolderPath);
    await writeFile(
      join(temporaryMetadataFolderPath, journalFileName),
      `${JSON.stringify(preConsentJournal, null, 2)}\n`,
    );
    await Promise.all(
      preConsentJournal.entries.map(async (entry) => {
        const migrationFileName = `${entry.tag}.sql`;

        await copyFile(
          join(applicationMigrationsFolderPath, migrationFileName),
          join(temporaryFolderPath, migrationFileName),
        );
      }),
    );
  }
}

async function removeTemporaryMigrationFolder(
  temporaryFolderPath: string,
): Promise<void> {
  await rm(temporaryFolderPath, {
    force: true,
    recursive: true,
  });
}
