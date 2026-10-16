export const NOTIFICATION_PARTIES = ["coach", "client"] as const;

export type NotificationParty = (typeof NOTIFICATION_PARTIES)[number];

export type NotificationRecipientSnapshot =
  { party: "coach" } | { party: "client"; clientId: string };

export class NotificationRecipient {
  private constructor(
    private readonly snapshot: NotificationRecipientSnapshot,
  ) {}

  static coach(): NotificationRecipient {
    return new NotificationRecipient({ party: "coach" });
  }

  static client(clientId: string): NotificationRecipient {
    return new NotificationRecipient({ party: "client", clientId });
  }

  toSnapshot(): NotificationRecipientSnapshot {
    return { ...this.snapshot };
  }
}
