import type { ClientReach } from "./client-reach";

import { NotificationRecipient } from "./notification-recipient";

export type NotificationReader =
  { party: "coach" } | { party: "client"; authSubjectId: string };

type NotificationRecipientReachOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
};

export class NotificationRecipientReach {
  constructor(private readonly options: NotificationRecipientReachOptions) {}

  async recipientOf(
    reader: NotificationReader,
  ): Promise<NotificationRecipient | null> {
    if (reader.party === "coach") {
      return NotificationRecipient.coach();
    }

    const client = await this.options.clients.findByAuthSubjectId(
      reader.authSubjectId,
    );

    if (!client || client.portal === "ended") {
      return null;
    }

    return NotificationRecipient.client(client.clientId);
  }
}
