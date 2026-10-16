import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";

import { MarkNotificationReadUseCase } from "./mark-notification-read-use-case";
import type { NotificationInbox } from "./notification-inbox";

const NOW = new Date("2026-10-15T09:00:00.000Z");

const ANA: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: null,
  paidThrough: null,
  timeZone: "Europe/Bucharest",
};

function createMarkRead(options?: { client?: ClientReachReading | null }) {
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(options?.client === undefined ? ANA : options.client),
  } satisfies Pick<ClientReach, "findByAuthSubjectId">;
  const inbox = {
    markRead: vi.fn().mockResolvedValue("marked"),
  } satisfies Pick<NotificationInbox, "markRead">;
  const ports = { clients, clock: { now: () => NOW }, inbox };

  return { markRead: new MarkNotificationReadUseCase(ports), ports };
}

describe("MarkNotificationReadUseCase", () => {
  it("marks her own notification read now", async () => {
    // arrange
    const { markRead, ports } = createMarkRead();

    // act
    const result = await markRead.execute({
      reader: { party: "client", authSubjectId: "user_ana" },
      notificationId: "notification-1",
    });

    // assert
    expect(result).toBe("marked");
    expect(ports.inbox.markRead).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      id: "notification-1",
      at: NOW,
    });
  });

  it("marks the coach's notification read for the coach", async () => {
    // arrange
    const { markRead, ports } = createMarkRead();

    // act
    const result = await markRead.execute({
      reader: { party: "coach" },
      notificationId: "notification-1",
    });

    // assert
    expect(result).toBe("marked");
    expect(ports.inbox.markRead).toHaveBeenCalledWith({
      recipient: { party: "coach" },
      id: "notification-1",
      at: NOW,
    });
  });

  it("answers unknown for a notification that is not hers", async () => {
    // arrange
    const { markRead, ports } = createMarkRead();
    ports.inbox.markRead.mockResolvedValue("unknown");

    // act
    const result = await markRead.execute({
      reader: { party: "client", authSubjectId: "user_ana" },
      notificationId: "notification-of-another-client",
    });

    // assert
    expect(result).toBe("unknown");
  });

  it.each([
    { situation: "whose coaching ended", client: { ...ANA, portal: "ended" } },
    { situation: "who is unknown", client: null },
  ] as const)("answers unknown to a client $situation", async ({ client }) => {
    // arrange
    const { markRead, ports } = createMarkRead({ client });

    // act
    const result = await markRead.execute({
      reader: { party: "client", authSubjectId: "user_ana" },
      notificationId: "notification-1",
    });

    // assert
    expect(result).toBe("unknown");
    expect(ports.inbox.markRead).not.toHaveBeenCalled();
  });
});
