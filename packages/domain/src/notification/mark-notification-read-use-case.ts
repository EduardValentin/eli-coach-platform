import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import type { NotificationInbox } from "./notification-inbox";
import {
  NotificationRecipientReach,
  type NotificationReader,
} from "./notification-recipient-reach";

type MarkNotificationReadUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  inbox: Pick<NotificationInbox, "markRead">;
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

    return this.options.inbox.markRead({
      recipient: recipient.toSnapshot(),
      id: command.notificationId,
      at: this.options.clock.now(),
    });
  }
}
