import type { Notification, NotificationDraft } from "./notification";
import type { NotificationRecipientSnapshot } from "./notification-recipient";

export interface NotificationInbox {
  record(command: {
    drafts: readonly NotificationDraft[];
    at: Date;
  }): Promise<void>;
  latestFor(query: {
    recipient: NotificationRecipientSnapshot;
    since: Date;
    limit: number;
  }): Promise<Notification[]>;
  unreadCountFor(query: {
    recipient: NotificationRecipientSnapshot;
    since: Date;
  }): Promise<number>;
  markRead(command: {
    recipient: NotificationRecipientSnapshot;
    id: string;
    at: Date;
  }): Promise<"marked" | "unknown">;
  markAllRead(command: {
    recipient: NotificationRecipientSnapshot;
    at: Date;
  }): Promise<void>;
}
