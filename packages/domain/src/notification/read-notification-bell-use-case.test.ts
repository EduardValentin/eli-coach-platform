import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";

import { Notification, type NotificationDraft } from "./notification";
import type { NotificationExpirySource } from "./notification-expiry-source";
import type { NotificationInbox } from "./notification-inbox";
import type { NotificationIncidents } from "./notification-incidents";
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

const EXPIRED: NotificationDraft = {
  recipient: { party: "client", clientId: "client-1" },
  kind: "check-in.request-expired",
  facts: { checkInId: "check-in-2", startsAt: "2026-10-14T15:00:00.000Z" },
  arrivedAt: new Date("2026-10-14T15:00:00.000Z"),
  onceKey: "check-in:check-in-2:request_expired:client",
};

function createReadBell(options?: { client?: ClientReachReading | null }) {
  const calls: string[] = [];
  const clients = {
    findByAuthSubjectId: vi
      .fn()
      .mockResolvedValue(options?.client === undefined ? ANA : options.client),
  } satisfies Pick<ClientReach, "findByAuthSubjectId">;
  const inbox = {
    record: vi.fn(async () => {
      calls.push("record");
    }),
    latestFor: vi.fn(async () => {
      calls.push("latestFor");
      return [APPROVED];
    }),
    unreadCountFor: vi.fn(async () => {
      calls.push("unreadCountFor");
      return 1;
    }),
  } satisfies Pick<
    NotificationInbox,
    "record" | "latestFor" | "unreadCountFor"
  >;
  const expirySource = {
    expiredFor: vi.fn().mockResolvedValue([EXPIRED]),
  } satisfies NotificationExpirySource;
  const incidents = {
    notificationBellReadFailed: vi.fn(),
    notificationExpiriesFailed: vi.fn(),
  } satisfies NotificationIncidents;
  const ports = {
    clients,
    clock: { now: () => NOW },
    expirySources: [expirySource],
    inbox,
    incidents,
  };

  return {
    readBell: new ReadNotificationBellUseCase(ports),
    ports,
    expirySource,
    calls,
  };
}

const ANA_READS = { party: "client", authSubjectId: "user_ana" } as const;

describe("ReadNotificationBellUseCase", () => {
  it("answers her latest notifications and unread count from the last 90 days", async () => {
    // arrange
    const { readBell, ports } = createReadBell();

    // act
    const bell = await readBell.execute(ANA_READS);

    // assert
    expect(bell).toEqual({
      notifications: [APPROVED.toSnapshot()],
      unreadCount: 1,
      checkedAt: NOW,
    });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.inbox.latestFor).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      since: NINETY_DAYS_AGO,
      limit: 30,
    });
    expect(ports.inbox.unreadCountFor).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      since: NINETY_DAYS_AGO,
    });
  });

  it("reads the coach's bell without looking up a client", async () => {
    // arrange
    const { readBell, ports, expirySource } = createReadBell();

    // act
    await readBell.execute({ party: "coach" });

    // assert
    expect(ports.clients.findByAuthSubjectId).not.toHaveBeenCalled();
    expect(expirySource.expiredFor).toHaveBeenCalledWith({
      recipient: { party: "coach" },
      since: NINETY_DAYS_AGO,
      at: NOW,
    });
    expect(ports.inbox.latestFor).toHaveBeenCalledWith({
      recipient: { party: "coach" },
      since: NINETY_DAYS_AGO,
      limit: 30,
    });
  });

  it("records the expiries her sources hand over before it reads the bell", async () => {
    // arrange
    const { readBell, ports, expirySource, calls } = createReadBell();

    // act
    await readBell.execute(ANA_READS);

    // assert
    expect(expirySource.expiredFor).toHaveBeenCalledWith({
      recipient: { party: "client", clientId: "client-1" },
      since: NINETY_DAYS_AGO,
      at: NOW,
    });
    expect(ports.inbox.record).toHaveBeenCalledWith({
      drafts: [EXPIRED],
      at: NOW,
    });
    expect(calls.indexOf("record")).toBeLessThan(calls.indexOf("latestFor"));
    expect(calls.indexOf("record")).toBeLessThan(
      calls.indexOf("unreadCountFor"),
    );
  });

  it("records nothing when no source has an expiry", async () => {
    // arrange
    const { readBell, ports, expirySource } = createReadBell();
    expirySource.expiredFor.mockResolvedValue([]);

    // act
    await readBell.execute(ANA_READS);

    // assert
    expect(ports.inbox.record).not.toHaveBeenCalled();
    expect(ports.inbox.latestFor).toHaveBeenCalledOnce();
  });

  it("reports failed expiries and still reads the bell", async () => {
    // arrange
    const failure = new Error("check-ins unavailable");
    const { readBell, ports, expirySource } = createReadBell();
    expirySource.expiredFor.mockRejectedValue(failure);

    // act
    const bell = await readBell.execute(ANA_READS);

    // assert
    expect(ports.incidents.notificationExpiriesFailed).toHaveBeenCalledWith({
      party: "client",
      error: failure,
    });
    expect(ports.inbox.record).not.toHaveBeenCalled();
    expect(bell).toEqual({
      notifications: [APPROVED.toSnapshot()],
      unreadCount: 1,
      checkedAt: NOW,
    });
  });

  it("reports a failed bell read and answers an empty bell", async () => {
    // arrange
    const failure = new Error("connection refused");
    const { readBell, ports } = createReadBell();
    ports.inbox.latestFor.mockRejectedValue(failure);

    // act
    const bell = await readBell.execute({ party: "coach" });

    // assert
    expect(ports.incidents.notificationBellReadFailed).toHaveBeenCalledWith({
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
      const { readBell, ports, expirySource } = createReadBell({ client });

      // act
      const bell = await readBell.execute(ANA_READS);

      // assert
      expect(bell).toEqual({
        notifications: [],
        unreadCount: 0,
        checkedAt: NOW,
      });
      expect(expirySource.expiredFor).not.toHaveBeenCalled();
      expect(ports.inbox.latestFor).not.toHaveBeenCalled();
    },
  );
});
