import { describe, expect, it, vi } from "vitest";

import type {
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";

import { MarkAllNotificationsReadUseCase } from "./mark-all-notifications-read-use-case";
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

function createMarkAllRead(options?: { client?: ClientReachReading | null }) {
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(options?.client === undefined ? ANA : options.client),
  } satisfies Pick<ClientReach, "findByAuthSubjectId">;
  const inbox = {
    markAllRead: vi.fn().mockResolvedValue(undefined),
  } satisfies Pick<NotificationInbox, "markAllRead">;
  const ports = { clients, clock: { now: () => NOW }, inbox };

  return { markAllRead: new MarkAllNotificationsReadUseCase(ports), ports };
}

describe("MarkAllNotificationsReadUseCase", () => {
  it("marks every notification of hers read now", async () => {
    // arrange
    const { markAllRead, ports } = createMarkAllRead();

    // act
    const result = await markAllRead.execute({
      party: "client",
      authSubjectId: "user_ana",
    });

    // assert
    expect(result).toBe("marked");
    expect(ports.inbox.markAllRead).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      at: NOW,
    });
  });

  it("marks every notification of the coach read for the coach only", async () => {
    // arrange
    const { markAllRead, ports } = createMarkAllRead();

    // act
    const result = await markAllRead.execute({ party: "coach" });

    // assert
    expect(result).toBe("marked");
    expect(ports.inbox.markAllRead).toHaveBeenCalledWith({
      recipient: { party: "coach" },
      at: NOW,
    });
  });

  it.each([
    { situation: "whose coaching ended", client: { ...ANA, portal: "ended" } },
    { situation: "who is unknown", client: null },
  ] as const)("answers unknown to a client $situation", async ({ client }) => {
    // arrange
    const { markAllRead, ports } = createMarkAllRead({ client });

    // act
    const result = await markAllRead.execute({
      party: "client",
      authSubjectId: "user_ana",
    });

    // assert
    expect(result).toBe("unknown");
    expect(ports.inbox.markAllRead).not.toHaveBeenCalled();
  });
});
