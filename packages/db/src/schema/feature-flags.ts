import { boolean, serial, text, timestamp } from "drizzle-orm/pg-core";
import { appSchema } from "./app-schema";

export const featureFlagsTable = appSchema.table("feature_flags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
