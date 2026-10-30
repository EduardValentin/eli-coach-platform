import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { MarkNotificationReadUseCase } from "./mark-notification-read-use-case";
import type { NotificationInboxPort } from "./notification-inbox-port";

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
  } satisfies Pick<ClientReachPort, "findByAuthSubjectId">;
  const inbox = {
    markRead: vi.fn().mockResolvedValue("marked"),
  } satisfies Pick<NotificationInboxPort, "markRead">;
  const ports = {
    clientReachPort: clients,
    clockPort: { now: () => NOW },
    notificationInboxPort: inbox,
  };

  return {
    markNotificationReadUseCase: new MarkNotificationReadUseCase(ports),
    ports,
  };
}

describe("MarkNotificationReadUseCase", () => {
  it("marks her own notification read now", async () => {
    // arrange
    const { markNotificationReadUseCase, ports } = createMarkRead();

    // act
    const result = await markNotificationReadUseCase.execute({
      reader: { party: "client", authSubjectId: "user_ana" },
      notificationId: "notification-1",
    });

    // assert
    expect(result).toBe("marked");
    expect(ports.notificationInboxPort.markRead).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      id: "notification-1",
      at: NOW,
    });
  });

  it("marks the coach's notification read for the coach", async () => {
    // arrange
    const { markNotificationReadUseCase, ports } = createMarkRead();

    // act
    const result = await markNotificationReadUseCase.execute({
      reader: { party: "coach" },
      notificationId: "notification-1",
    });

    // assert
    expect(result).toBe("marked");
    expect(ports.notificationInboxPort.markRead).toHaveBeenCalledWith({
      recipient: { party: "coach" },
      id: "notification-1",
      at: NOW,
    });
  });

  it("answers unknown for a notification that is not hers", async () => {
    // arrange
    const { markNotificationReadUseCase, ports } = createMarkRead();
    ports.notificationInboxPort.markRead.mockResolvedValue("unknown");

    // act
    const result = await markNotificationReadUseCase.execute({
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
    const { markNotificationReadUseCase, ports } = createMarkRead({ client });

    // act
    const result = await markNotificationReadUseCase.execute({
      reader: { party: "client", authSubjectId: "user_ana" },
      notificationId: "notification-1",
    });

    // assert
    expect(result).toBe("unknown");
    expect(ports.notificationInboxPort.markRead).not.toHaveBeenCalled();
  });
});
