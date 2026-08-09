import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_MIGRATION_URL;
const migrationsFolderOverridePath = process.env.DATABASE_MIGRATIONS_FOLDER;

export default defineConfig({
  dialect: "postgresql",
  migrations: {
    schema: "app",
    table: "__drizzle_migrations",
  },
  out: migrationsFolderOverridePath || "./drizzle",
  // packages/db owns the "app" Postgres schema namespace, but individual tables
  // can be defined inside other workspace packages that own the feature (e.g.
  // packages/infrastructure/src/feature-flags/schema.server.ts). Rather than
  // hand-enumerating each such file here — a step that is easy to forget and
  // whose failure mode is a silent DROP TABLE migration — this glob picks up
  // any *.server.ts file with "schema" in its name under any sibling package's
  // src tree, by convention.
  schema: ["./src/schema/index.ts", "../*/src/**/*schema*.server.ts"],
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
