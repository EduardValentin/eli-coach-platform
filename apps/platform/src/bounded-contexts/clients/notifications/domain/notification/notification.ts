import type { NotificationRecipientSnapshot } from "./notification-recipient";

export const NOTIFICATION_BELL_RULES = { latest: 30, windowDays: 90 } as const;

export type NotificationFacts = Readonly<Record<string, string | number>>;

export type NotificationSnapshot = {
  id: string;
  recipient: NotificationRecipientSnapshot;
  kind: string;
  facts: NotificationFacts;
  arrivedAt: Date;
  readAt: Date | null;
};

export type NotificationDraft = {
  recipient: NotificationRecipientSnapshot;
  kind: string;
  facts: NotificationFacts;
  arrivedAt: Date;
  onceKey: string | null;
};

export class Notification {
  readonly id: string;
  readonly recipient: NotificationRecipientSnapshot;
  readonly kind: string;
  readonly facts: NotificationFacts;
  readonly arrivedAt: Date;
  readonly readAt: Date | null;

  private constructor(props: NotificationSnapshot) {
    this.id = props.id;
    this.recipient = props.recipient;
    this.kind = props.kind;
    this.facts = props.facts;
    this.arrivedAt = props.arrivedAt;
    this.readAt = props.readAt;
  }

  static reconstitute(props: NotificationSnapshot): Notification {
    return new Notification(props);
  }

  isUnread(): boolean {
    return this.readAt === null;
  }

  toSnapshot(): NotificationSnapshot {
    return {
      id: this.id,
      recipient: this.recipient,
      kind: this.kind,
      facts: this.facts,
      arrivedAt: this.arrivedAt,
      readAt: this.readAt,
    };
  }
}
