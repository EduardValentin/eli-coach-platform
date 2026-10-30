import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { NotificationInboxPort } from "./notification-inbox-port";
import {
  NotificationRecipientReach,
  type NotificationReader,
} from "./notification-recipient-reach";

type MarkAllNotificationsReadUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
  notificationInboxPort: Pick<NotificationInboxPort, "markAllRead">;
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

    await this.options.notificationInboxPort.markAllRead({
      recipient: recipient.toSnapshot(),
      at: this.options.clockPort.now(),
    });

    return "marked";
  }
}
