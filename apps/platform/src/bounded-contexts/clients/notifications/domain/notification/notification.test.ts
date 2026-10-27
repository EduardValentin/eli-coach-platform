import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_BELL_RULES,
  Notification,
  type NotificationSnapshot,
} from "./notification";

const ARRIVED_AT = new Date("2026-10-15T09:00:00.000Z");

const UNREAD: NotificationSnapshot = {
  id: "notification-1",
  recipient: { party: "client", clientId: "client-1" },
  kind: "check-in.approved",
  facts: { checkInId: "check-in-1", startsAt: "2026-10-17T15:00:00.000Z" },
  arrivedAt: ARRIVED_AT,
  readAt: null,
};

describe("Notification", () => {
  it("keeps what it was reconstituted from", () => {
    // arrange
    const notification = Notification.reconstitute(UNREAD);

    // act
    const snapshot = notification.toSnapshot();

    // assert
    expect(snapshot).toEqual(UNREAD);
  });

  it("is unread until it has been read", () => {
    // arrange
    const notification = Notification.reconstitute(UNREAD);

    // act
    const unread = notification.isUnread();

    // assert
    expect(unread).toBe(true);
  });

  it("is read once it carries a read instant", () => {
    // arrange
    const notification = Notification.reconstitute({
      ...UNREAD,
      readAt: new Date("2026-10-15T10:00:00.000Z"),
    });

    // act
    const unread = notification.isUnread();

    // assert
    expect(unread).toBe(false);
  });

  it("keeps the latest 30 from the last 90 days in the bell", () => {
    // arrange
    const rules = NOTIFICATION_BELL_RULES;

    // act
    const { latest, windowDays } = rules;

    // assert
    expect({ latest, windowDays }).toEqual({ latest: 30, windowDays: 90 });
  });
});
