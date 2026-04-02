import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  migrations: {
    schema: "app",
    table: "__drizzle_migrations",
  },
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
