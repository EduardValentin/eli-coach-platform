import type { Notification, NotificationDraft } from "./notification";
import type { NotificationRecipientSnapshot } from "./notification-recipient";

export interface NotificationInboxPort {
  record(command: {
    drafts: readonly NotificationDraft[];
    at: Date;
  }): Promise<void>;
  withdrawUnarrived(command: {
    onceKeys: readonly string[];
    at: Date;
  }): Promise<void>;
  latestFor(query: {
    recipient: NotificationRecipientSnapshot;
    since: Date;
    at: Date;
    limit: number;
  }): Promise<Notification[]>;
  unreadCountFor(query: {
    recipient: NotificationRecipientSnapshot;
    since: Date;
    at: Date;
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
