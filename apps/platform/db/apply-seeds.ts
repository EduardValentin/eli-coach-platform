import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

type SeedExecutor = { query(text: string): Promise<unknown> };

const seedsFolder = fileURLToPath(new URL("seeds", import.meta.url));

export async function applySeeds(executor: SeedExecutor): Promise<void> {
  const seedFileNames = (await readdir(seedsFolder))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const seeds = await Promise.all(
    seedFileNames.map((fileName) =>
      readFile(join(seedsFolder, fileName), "utf8"),
    ),
  );

  await executor.query(seeds.join("\n"));
}

async function applySeedsToMigrationDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_MIGRATION_URL;

  if (!connectionString) {
    throw new Error("DATABASE_MIGRATION_URL is required to apply seeds.");
  }

  const client = new pg.Client({ connectionString });

  await client.connect();

  try {
    await applySeeds(client);
  } finally {
    await client.end();
  }
}

const commandLineEntry = process.argv[1];

if (
  commandLineEntry &&
  resolve(commandLineEntry) === fileURLToPath(import.meta.url)
) {
  await applySeedsToMigrationDatabase();
}
