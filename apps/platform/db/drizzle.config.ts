import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_MIGRATION_URL;
const migrationsFolderOverridePath = process.env.DATABASE_MIGRATIONS_FOLDER;

// drizzle-kit resolves every relative path below (schema globs and the
// default "out") against process.cwd() at the time it runs, not against the
// directory this config file lives in. The "db:generate"/"db:migrate"
// scripts in ../package.json are always invoked with apps/platform as the
// working directory (via `pnpm --filter @eli-coach-platform/platform run
// ...`), so every relative path here is written relative to apps/platform,
// even though the file itself sits one level down in apps/platform/db.
export default defineConfig({
  dialect: "postgresql",
  migrations: {
    schema: "app",
    table: "__drizzle_migrations",
  },
  out: migrationsFolderOverridePath || "./db/drizzle",
  // shared/database owns the "app" Postgres schema namespace; each table is
  // defined beside the code that owns it. A schema file missing from these
  // globs yields a silent DROP TABLE migration, so they match every
  // *schema*.server.ts file by convention instead of listing each one.
  schema: [
    "./src/shared/database/schema/index.ts",
    "./src/**/*schema*.server.ts",
  ],
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
