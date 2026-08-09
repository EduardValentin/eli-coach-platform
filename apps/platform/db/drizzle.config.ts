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
  // packages/db owns the "app" Postgres schema namespace, but individual tables
  // can be defined inside other workspace packages that own the feature (e.g.
  // packages/infrastructure/src/feature-flags/schema.server.ts) or, eventually,
  // inside this app's own features. Rather than hand-enumerating each such file
  // here — a step that is easy to forget and whose failure mode is a silent
  // DROP TABLE migration — the second and third entries glob for any
  // *.server.ts file with "schema" in its name under sibling packages and
  // under this app's features, by convention.
  schema: [
    "../../packages/db/src/schema/index.ts",
    "../../packages/*/src/**/*schema*.server.ts",
    "./src/features/*/data/schema.server.ts",
  ],
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
