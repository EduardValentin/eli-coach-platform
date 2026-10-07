import { appSchema } from "@eli-coach-platform/db";
import {
  RESOURCE_FILE_FORMATS,
  type ResourceFileFormat,
} from "@eli-coach-platform/domain/client-resources";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export const clientResourcesTable = appSchema.table(
  "client_resources",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    originalName: text("original_name").notNull(),
    format: varchar("format", { length: 8 })
      .$type<ResourceFileFormat>()
      .notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pageCount: integer("page_count"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("client_resources_client_id_added_at_idx").on(
      table.clientId,
      table.addedAt.desc(),
    ),
    check(
      "client_resources_format_check",
      sql`${table.format} in (${quotedList(RESOURCE_FILE_FORMATS)})`,
    ),
    check(
      "client_resources_page_count_check",
      sql`${table.pageCount} is null or ${table.pageCount} >= 1`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
