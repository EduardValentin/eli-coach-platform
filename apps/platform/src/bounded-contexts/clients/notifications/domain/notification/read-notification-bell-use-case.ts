import type { ClientReach } from "./client-reach";
import type { Clock } from "../clock";

import {
  NOTIFICATION_BELL_RULES,
  type NotificationSnapshot,
} from "./notification";
import type { NotificationInbox } from "./notification-inbox";
import type { NotificationIncidents } from "./notification-incidents";
import type { NotificationRecipientSnapshot } from "./notification-recipient";
import {
  NotificationRecipientReach,
  type NotificationReader,
} from "./notification-recipient-reach";

type BellNotification = NotificationSnapshot & { unread: boolean };

export type NotificationBell = {
  notifications: BellNotification[];
  unreadCount: number;
  checkedAt: Date;
};

type ReadNotificationBellUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  inbox: Pick<NotificationInbox, "latestFor" | "unreadCountFor">;
  incidents: NotificationIncidents;
};

type BellWindow = {
  recipient: NotificationRecipientSnapshot;
  since: Date;
  at: Date;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class ReadNotificationBellUseCase {
  private readonly reach: NotificationRecipientReach;

  constructor(private readonly options: ReadNotificationBellUseCaseOptions) {
    this.reach = new NotificationRecipientReach(options);
  }

  async execute(reader: NotificationReader): Promise<NotificationBell> {
    const at = this.options.clock.now();

    try {
      const recipient = await this.reach.recipientOf(reader);

      if (!recipient) {
        return this.emptyBell(at);
      }

      const window: BellWindow = {
        recipient: recipient.toSnapshot(),
        since: new Date(
          at.getTime() -
            NOTIFICATION_BELL_RULES.windowDays * MILLISECONDS_PER_DAY,
        ),
        at,
      };

      return await this.readBell(window);
    } catch (error) {
      this.options.incidents.notificationBellReadFailed({
        party: reader.party,
        error,
      });

      return this.emptyBell(at);
    }
  }

  private async readBell({
    recipient,
    since,
    at,
  }: BellWindow): Promise<NotificationBell> {
    const [notifications, unreadCount] = await Promise.all([
      this.options.inbox.latestFor({
        recipient,
        since,
        at,
        limit: NOTIFICATION_BELL_RULES.latest,
      }),
      this.options.inbox.unreadCountFor({ recipient, since, at }),
    ]);

    return {
      notifications: notifications.map((notification) => ({
        ...notification.toSnapshot(),
        unread: notification.isUnread(),
      })),
      unreadCount,
      checkedAt: at,
    };
  }

  private emptyBell(at: Date): NotificationBell {
    return { notifications: [], unreadCount: 0, checkedAt: at };
  }
}
