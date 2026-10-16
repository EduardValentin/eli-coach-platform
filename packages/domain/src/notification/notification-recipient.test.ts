import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_PARTIES,
  NotificationRecipient,
} from "./notification-recipient";

describe("NotificationRecipient", () => {
  it("names the coach without a client", () => {
    // arrange
    const recipient = NotificationRecipient.coach();

    // act
    const snapshot = recipient.toSnapshot();

    // assert
    expect(snapshot).toEqual({ party: "coach" });
  });

  it("names a client by her id", () => {
    // arrange
    const recipient = NotificationRecipient.client("client-1");

    // act
    const snapshot = recipient.toSnapshot();

    // assert
    expect(snapshot).toEqual({ party: "client", clientId: "client-1" });
  });

  it("lists the two parties a notification can reach", () => {
    // arrange
    const parties = [
      NotificationRecipient.coach(),
      NotificationRecipient.client("client-1"),
    ].map((recipient) => recipient.toSnapshot().party);

    // act
    const listed = [...NOTIFICATION_PARTIES];

    // assert
    expect(listed).toEqual(parties);
  });
});
