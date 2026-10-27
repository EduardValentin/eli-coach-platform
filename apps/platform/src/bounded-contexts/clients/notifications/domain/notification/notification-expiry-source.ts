import type { NotificationDraft } from "./notification";
import type { NotificationRecipientSnapshot } from "./notification-recipient";

export interface NotificationExpirySource {
  expiredFor(query: {
    recipient: NotificationRecipientSnapshot;
    since: Date;
    at: Date;
  }): Promise<NotificationDraft[]>;
}
