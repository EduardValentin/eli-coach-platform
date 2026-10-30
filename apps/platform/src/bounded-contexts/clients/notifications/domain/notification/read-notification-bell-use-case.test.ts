import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort, ClientReachReading } from "./client-reach-port";

import { Notification } from "./notification";
import type { NotificationInboxPort } from "./notification-inbox-port";
import type { NotificationIncidentsPort } from "./notification-incidents-port";
import { ReadNotificationBellUseCase } from "./read-notification-bell-use-case";

const NOW = new Date("2026-10-15T09:00:00.000Z");
const NINETY_DAYS_AGO = new Date("2026-07-17T09:00:00.000Z");

const ANA: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: null,
  paidThrough: null,
  timeZone: "Europe/Bucharest",
};

const APPROVED = Notification.reconstitute({
  id: "notification-1",
  recipient: { party: "client", clientId: "client-1" },
  kind: "check-in.approved",
  facts: { checkInId: "check-in-1", startsAt: "2026-10-17T15:00:00.000Z" },
  arrivedAt: new Date("2026-10-14T09:00:00.000Z"),
  readAt: null,
});

const SEEN = Notification.reconstitute({
  id: "notification-2",
  recipient: { party: "client", clientId: "client-1" },
  kind: "check-in.declined",
  facts: { checkInId: "check-in-3", startsAt: "2026-10-16T15:00:00.000Z" },
  arrivedAt: new Date("2026-10-13T09:00:00.000Z"),
  readAt: new Date("2026-10-13T10:00:00.000Z"),
});

function createReadBell(options?: { client?: ClientReachReading | null }) {
  const calls: string[] = [];
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(options?.client === undefined ? ANA : options.client),
  } satisfies Pick<ClientReachPort, "findByAuthSubjectId">;
  const inbox = {
    latestFor: vi.fn(async () => {
      calls.push("latestFor");
      return [APPROVED];
    }),
    unreadCountFor: vi.fn(async () => {
      calls.push("unreadCountFor");
      return 1;
    }),
  } satisfies Pick<NotificationInboxPort, "latestFor" | "unreadCountFor">;
  const incidents = {
    notificationBellReadFailed: vi.fn(),
  } satisfies NotificationIncidentsPort;
  const ports = {
    clientReachPort: clients,
    clockPort: { now: () => NOW },
    notificationInboxPort: inbox,
    notificationIncidentsPort: incidents,
  };

  return {
    readNotificationBellUseCase: new ReadNotificationBellUseCase(ports),
    ports,
    calls,
  };
}

const ANA_READS = { party: "client", authSubjectId: "user_ana" } as const;

describe("ReadNotificationBellUseCase", () => {
  it("tells each notification apart as unread or read", async () => {
    // arrange
    const { readNotificationBellUseCase, ports } = createReadBell();
    ports.notificationInboxPort.latestFor.mockResolvedValue([APPROVED, SEEN]);

    // act
    const bell = await readNotificationBellUseCase.execute(ANA_READS);

    // assert
    expect(
      bell.notifications.map(({ id, unread }) => ({ id, unread })),
    ).toEqual([
      { id: "notification-1", unread: true },
      { id: "notification-2", unread: false },
    ]);
  });

  it("answers her latest notifications and unread count from the last 90 days", async () => {
    // arrange
    const { readNotificationBellUseCase, ports } = createReadBell();

    // act
    const bell = await readNotificationBellUseCase.execute(ANA_READS);

    // assert
    expect(bell).toEqual({
      notifications: [{ ...APPROVED.toSnapshot(), unread: true }],
      unreadCount: 1,
      checkedAt: NOW,
    });
    expect(ports.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_ana",
    );
    expect(ports.notificationInboxPort.latestFor).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      since: NINETY_DAYS_AGO,
      at: NOW,
      limit: 30,
    });
    expect(ports.notificationInboxPort.unreadCountFor).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      since: NINETY_DAYS_AGO,
      at: NOW,
    });
  });

  it("reads the coach's bell without looking up a client", async () => {
    // arrange
    const { readNotificationBellUseCase, ports } = createReadBell();

    // act
    await readNotificationBellUseCase.execute({ party: "coach" });

    // assert
    expect(ports.clientReachPort.findByAuthSubjectId).not.toHaveBeenCalled();
    expect(ports.notificationInboxPort.latestFor).toHaveBeenCalledWith({
      recipient: { party: "coach" },
      since: NINETY_DAYS_AGO,
      at: NOW,
      limit: 30,
    });
  });

  it("reports a failed bell read and answers an empty bell", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { readNotificationBellUseCase, ports } = createReadBell();
    ports.notificationInboxPort.latestFor.mockRejectedValue(failure);

    // act
    const bell = await readNotificationBellUseCase.execute({ party: "coach" });

    // assert
    expect(
      ports.notificationIncidentsPort.notificationBellReadFailed,
    ).toHaveBeenCalledWith({
      party: "coach",
      error: failure,
    });
    expect(bell).toEqual({ notifications: [], unreadCount: 0, checkedAt: NOW });
  });

  it.each([
    { situation: "whose coaching ended", client: { ...ANA, portal: "ended" } },
    { situation: "who is unknown", client: null },
  ] as const)(
    "answers an empty bell to a client $situation",
    async ({ client }) => {
      // arrange
      const { readNotificationBellUseCase, ports } = createReadBell({ client });

      // act
      const bell = await readNotificationBellUseCase.execute(ANA_READS);

      // assert
      expect(bell).toEqual({
        notifications: [],
        unreadCount: 0,
        checkedAt: NOW,
      });
      expect(ports.notificationInboxPort.latestFor).not.toHaveBeenCalled();
    },
  );
});
