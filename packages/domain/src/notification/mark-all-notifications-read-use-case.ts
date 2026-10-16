import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import type { NotificationInbox } from "./notification-inbox";
import {
  NotificationRecipientReach,
  type NotificationReader,
} from "./notification-recipient-reach";

type MarkAllNotificationsReadUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  inbox: Pick<NotificationInbox, "markAllRead">;
};

export class MarkAllNotificationsReadUseCase {
  private readonly reach: NotificationRecipientReach;

  constructor(
    private readonly options: MarkAllNotificationsReadUseCaseOptions,
  ) {
    this.reach = new NotificationRecipientReach(options);
  }

  async execute(reader: NotificationReader): Promise<"marked" | "unknown"> {
    const recipient = await this.reach.recipientOf(reader);

    if (!recipient) {
      return "unknown";
    }

    await this.options.inbox.markAllRead({
      recipient: recipient.toSnapshot(),
      at: this.options.clock.now(),
    });

    return "marked";
  }
}
