import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { NotificationInboxPort } from "./notification-inbox-port";
import {
  NotificationRecipientReach,
  type NotificationReader,
} from "./notification-recipient-reach";

type MarkNotificationReadUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
  notificationInboxPort: Pick<NotificationInboxPort, "markRead">;
};

export class MarkNotificationReadUseCase {
  private readonly reach: NotificationRecipientReach;

  constructor(private readonly options: MarkNotificationReadUseCaseOptions) {
    this.reach = new NotificationRecipientReach(options);
  }

  async execute(command: {
    reader: NotificationReader;
    notificationId: string;
  }): Promise<"marked" | "unknown"> {
    const recipient = await this.reach.recipientOf(command.reader);

    if (!recipient) {
      return "unknown";
    }

    return this.options.notificationInboxPort.markRead({
      recipient: recipient.toSnapshot(),
      id: command.notificationId,
      at: this.options.clockPort.now(),
    });
  }
}
