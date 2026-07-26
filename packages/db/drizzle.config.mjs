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
  schema: "./src/schema/index.ts",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
