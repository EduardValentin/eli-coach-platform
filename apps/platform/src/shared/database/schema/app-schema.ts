import { pgSchema } from "drizzle-orm/pg-core";

// Every application table lives in this Postgres schema. Shared so that table
// definitions in different modules cannot drift onto different namespaces.
export const appSchema = pgSchema("app");
