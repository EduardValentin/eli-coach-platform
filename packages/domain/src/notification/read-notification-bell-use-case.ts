import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import {
  NOTIFICATION_BELL_RULES,
  type NotificationSnapshot,
} from "./notification";
import type { NotificationExpirySource } from "./notification-expiry-source";
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
  expirySources: readonly NotificationExpirySource[];
  inbox: Pick<NotificationInbox, "record" | "latestFor" | "unreadCountFor">;
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

      await this.recordExpiries(window);

      return await this.readBell(window);
    } catch (error) {
      this.options.incidents.notificationBellReadFailed({
        party: reader.party,
        error,
      });

      return this.emptyBell(at);
    }
  }

  private async recordExpiries(window: BellWindow): Promise<void> {
    try {
      const expired = await Promise.all(
        this.options.expirySources.map((source) => source.expiredFor(window)),
      );
      const drafts = expired.flat();

      if (drafts.length > 0) {
        await this.options.inbox.record({ drafts, at: window.at });
      }
    } catch (error) {
      this.options.incidents.notificationExpiriesFailed({
        party: window.recipient.party,
        error,
      });
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
        limit: NOTIFICATION_BELL_RULES.latest,
      }),
      this.options.inbox.unreadCountFor({ recipient, since }),
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
