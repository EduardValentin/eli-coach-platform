import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  Notification,
  type NotificationDraft,
  type NotificationInbox,
  type NotificationRecipientSnapshot,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import { and, count, desc, eq, gte, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { notificationsTable } from "~/bounded-contexts/clients/notifications/adapters/outbound/persistence/schema.server";

type PostgresNotificationInboxOptions = {
  database: DatabaseClient;
};

type NotificationRow = typeof notificationsTable.$inferSelect;

type NotificationInsert = typeof notificationsTable.$inferInsert;

type Recorded = Parameters<NotificationInbox["record"]>[0];
type LatestQuery = Parameters<NotificationInbox["latestFor"]>[0];
type UnreadQuery = Parameters<NotificationInbox["unreadCountFor"]>[0];
type ReadMark = Parameters<NotificationInbox["markRead"]>[0];
type AllReadMark = Parameters<NotificationInbox["markAllRead"]>[0];

const storedFactsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]),
);

export class PostgresNotificationInbox implements NotificationInbox {
  constructor(private readonly options: PostgresNotificationInboxOptions) {}

  private get executor() {
    return executorOf(this.options.database);
  }

  async record({ drafts }: Recorded): Promise<void> {
    if (drafts.length === 0) {
      return;
    }

    await this.executor.transaction((savepoint) =>
      savepoint
        .insert(notificationsTable)
        .values(drafts.map((draft) => this.rowOf(draft)))
        .onConflictDoNothing({
          target: notificationsTable.onceKey,
          where: sql`${notificationsTable.onceKey} is not null`,
        }),
    );
  }

  async latestFor({
    recipient,
    since,
    limit,
  }: LatestQuery): Promise<Notification[]> {
    const rows = await this.executor
      .select()
      .from(notificationsTable)
      .where(
        and(
          this.addressedTo(recipient),
          gte(notificationsTable.arrivedAt, since),
        ),
      )
      .orderBy(desc(notificationsTable.arrivedAt), desc(notificationsTable.id))
      .limit(limit);

    return rows.map((row) => this.notificationOf(row));
  }

  async unreadCountFor({ recipient, since }: UnreadQuery): Promise<number> {
    const [counted] = await this.executor
      .select({ unread: count() })
      .from(notificationsTable)
      .where(
        and(
          this.addressedTo(recipient),
          isNull(notificationsTable.readAt),
          gte(notificationsTable.arrivedAt, since),
        ),
      );

    return counted?.unread ?? 0;
  }

  async markRead({
    recipient,
    id,
    at,
  }: ReadMark): Promise<"marked" | "unknown"> {
    const marked = await this.executor
      .update(notificationsTable)
      .set({ readAt: sql`coalesce(${notificationsTable.readAt}, ${at})` })
      .where(and(this.addressedTo(recipient), eq(notificationsTable.id, id)))
      .returning({ id: notificationsTable.id });

    return marked.length > 0 ? "marked" : "unknown";
  }

  async markAllRead({ recipient, at }: AllReadMark): Promise<void> {
    await this.executor
      .update(notificationsTable)
      .set({ readAt: at })
      .where(
        and(this.addressedTo(recipient), isNull(notificationsTable.readAt)),
      );
  }

  private addressedTo(
    recipient: NotificationRecipientSnapshot,
  ): SQL | undefined {
    if (recipient.party === "coach") {
      return and(
        eq(notificationsTable.recipientParty, "coach"),
        isNull(notificationsTable.recipientClientId),
      );
    }

    return and(
      eq(notificationsTable.recipientParty, "client"),
      eq(notificationsTable.recipientClientId, recipient.clientId),
    );
  }

  private rowOf(draft: NotificationDraft): NotificationInsert {
    return {
      recipientParty: draft.recipient.party,
      recipientClientId:
        draft.recipient.party === "client" ? draft.recipient.clientId : null,
      kind: draft.kind,
      facts: draft.facts,
      arrivedAt: draft.arrivedAt,
      onceKey: draft.onceKey,
    };
  }

  private notificationOf(row: NotificationRow): Notification {
    return Notification.reconstitute({
      id: row.id,
      recipient:
        row.recipientClientId === null
          ? { party: "coach" }
          : { party: "client", clientId: row.recipientClientId },
      kind: row.kind,
      facts: storedFactsSchema.parse(row.facts),
      arrivedAt: row.arrivedAt,
      readAt: row.readAt,
    });
  }
}
