import { appSchema } from "~/shared/database";
import {
  NOTIFICATION_PARTIES,
  type NotificationFacts,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/bounded-contexts/clients/clients/data/schema.server";

export const notificationConstraints = {
  recipient: "notifications_recipient_check",
  recipientArrived: "notifications_recipient_arrived_idx",
  unread: "notifications_unread_idx",
  onceKey: "notifications_once_key_unique",
} as const;

export const notificationsTable = appSchema.table(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientParty: varchar("recipient_party", {
      enum: NOTIFICATION_PARTIES,
      length: 6,
    }).notNull(),
    recipientClientId: uuid("recipient_client_id").references(
      () => clientsTable.id,
    ),
    kind: varchar("kind", { length: 64 }).notNull(),
    facts: jsonb("facts").$type<NotificationFacts>().notNull(),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    onceKey: varchar("once_key", { length: 160 }),
  },
  (table) => [
    check(
      notificationConstraints.recipient,
      sql`(${table.recipientParty} = 'coach' and ${table.recipientClientId} is null) or (${table.recipientParty} = 'client' and ${table.recipientClientId} is not null)`,
    ),
    index(notificationConstraints.recipientArrived).on(
      table.recipientParty,
      table.recipientClientId,
      table.arrivedAt.desc(),
      table.id,
    ),
    index(notificationConstraints.unread)
      .on(table.recipientParty, table.recipientClientId)
      .where(sql`${table.readAt} is null`),
    uniqueIndex(notificationConstraints.onceKey)
      .on(table.onceKey)
      .where(sql`${table.onceKey} is not null`),
  ],
);
