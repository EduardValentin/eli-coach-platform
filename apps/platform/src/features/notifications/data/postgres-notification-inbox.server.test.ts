import type { DatabaseClient } from "~/shared/database";
import type { NotificationDraft } from "@eli-coach-platform/domain/notification";
import { describe, expect, it, vi } from "vitest";

import { notificationsTable } from "~/features/notifications/data/schema.server";

import { PostgresNotificationInbox } from "./postgres-notification-inbox.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const NOTIFICATION_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const ARRIVED_AT = new Date("2026-10-15T09:00:00.000Z");
const READ_AT = new Date("2026-10-15T10:00:00.000Z");
const SINCE = new Date("2026-07-17T09:00:00.000Z");
const FACTS = {
  checkInId: "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a",
  startsAt: "2026-10-17T15:00:00.000Z",
};

const COACH_ROW = {
  id: NOTIFICATION_ID,
  recipientParty: "coach",
  recipientClientId: null,
  kind: "check-in.requested",
  facts: { ...FACTS, clientName: "Ana Pop" },
  arrivedAt: ARRIVED_AT,
  readAt: null,
  onceKey: null,
};

const CLIENT_ROW = {
  id: "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0",
  recipientParty: "client",
  recipientClientId: CLIENT_ID,
  kind: "check-in.approved",
  facts: FACTS,
  arrivedAt: ARRIVED_AT,
  readAt: READ_AT,
  onceKey: null,
};

describe("PostgresNotificationInbox#latestFor", () => {
  it("maps the coach's stored rows into her notifications", async () => {
    // arrange
    const { database } = createDatabaseSelecting([COACH_ROW]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    const notifications = await inbox.latestFor({
      recipient: { party: "coach" },
      since: SINCE,
      limit: 30,
    });

    // assert
    expect(
      notifications.map((notification) => notification.toSnapshot()),
    ).toEqual([
      {
        id: NOTIFICATION_ID,
        recipient: { party: "coach" },
        kind: "check-in.requested",
        facts: { ...FACTS, clientName: "Ana Pop" },
        arrivedAt: ARRIVED_AT,
        readAt: null,
      },
    ]);
  });

  it("maps a client's stored rows into notifications addressed to her", async () => {
    // arrange
    const { database } = createDatabaseSelecting([CLIENT_ROW]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    const [notification] = await inbox.latestFor({
      recipient: { party: "client", clientId: CLIENT_ID },
      since: SINCE,
      limit: 30,
    });

    // assert
    expect(notification?.recipient).toEqual({
      party: "client",
      clientId: CLIENT_ID,
    });
    expect(notification?.isUnread()).toBe(false);
  });

  it("reads no more rows than the limit asks for", async () => {
    // arrange
    const { database, chain } = createDatabaseSelecting([]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    await inbox.latestFor({
      recipient: { party: "coach" },
      since: SINCE,
      limit: 30,
    });

    // assert
    expect(chain.limit).toHaveBeenCalledWith(30);
  });

  it("refuses a stored row whose facts are not a plain record of strings and numbers", async () => {
    // arrange
    const { database } = createDatabaseSelecting([
      { ...COACH_ROW, facts: { nested: { startsAt: FACTS.startsAt } } },
    ]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    const latest = inbox.latestFor({
      recipient: { party: "coach" },
      since: SINCE,
      limit: 30,
    });

    // assert
    await expect(latest).rejects.toThrow();
  });
});

describe("PostgresNotificationInbox#unreadCountFor", () => {
  it("answers the count of unread rows the database counted", async () => {
    // arrange
    const { database } = createDatabaseSelecting([{ unread: 3 }]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    const unread = await inbox.unreadCountFor({
      recipient: { party: "client", clientId: CLIENT_ID },
      since: SINCE,
    });

    // assert
    expect(unread).toBe(3);
  });
});

describe("PostgresNotificationInbox#markRead", () => {
  it("answers marked when a notification of the recipient carries the id", async () => {
    // arrange
    const { database } = createDatabaseUpdating([{ id: NOTIFICATION_ID }]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    const result = await inbox.markRead({
      recipient: { party: "coach" },
      id: NOTIFICATION_ID,
      at: READ_AT,
    });

    // assert
    expect(result).toBe("marked");
  });

  it("answers unknown when no notification of the recipient carries the id", async () => {
    // arrange
    const { database } = createDatabaseUpdating([]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    const result = await inbox.markRead({
      recipient: { party: "client", clientId: CLIENT_ID },
      id: NOTIFICATION_ID,
      at: READ_AT,
    });

    // assert
    expect(result).toBe("unknown");
  });
});

describe("PostgresNotificationInbox#markAllRead", () => {
  it("stamps every unread notification of the recipient with the instant", async () => {
    // arrange
    const { database, chain } = createDatabaseUpdating([]);
    const inbox = new PostgresNotificationInbox({ database });

    // act
    await inbox.markAllRead({ recipient: { party: "coach" }, at: READ_AT });

    // assert
    expect(chain.set).toHaveBeenCalledWith({ readAt: READ_AT });
  });
});

describe("PostgresNotificationInbox#record", () => {
  it("inserts every draft in one statement, skipping a once-key already recorded", async () => {
    // arrange
    const { database, chain } = createDatabaseInserting();
    const inbox = new PostgresNotificationInbox({ database });
    const drafts: NotificationDraft[] = [
      {
        recipient: { party: "coach" },
        kind: "check-in.request-expired",
        facts: FACTS,
        arrivedAt: ARRIVED_AT,
        onceKey: "check-in:3c2b1a09:request_expired:coach",
      },
      {
        recipient: { party: "client", clientId: CLIENT_ID },
        kind: "check-in.approved",
        facts: FACTS,
        arrivedAt: ARRIVED_AT,
        onceKey: null,
      },
    ];

    // act
    await inbox.record({ drafts, at: ARRIVED_AT });

    // assert
    expect(database.insert).toHaveBeenCalledTimes(1);
    expect(chain.values).toHaveBeenCalledWith([
      {
        recipientParty: "coach",
        recipientClientId: null,
        kind: "check-in.request-expired",
        facts: FACTS,
        arrivedAt: ARRIVED_AT,
        onceKey: "check-in:3c2b1a09:request_expired:coach",
      },
      {
        recipientParty: "client",
        recipientClientId: CLIENT_ID,
        kind: "check-in.approved",
        facts: FACTS,
        arrivedAt: ARRIVED_AT,
        onceKey: null,
      },
    ]);
    expect(chain.onConflictDoNothing).toHaveBeenCalledWith(
      expect.objectContaining({ target: notificationsTable.onceKey }),
    );
  });

  it("writes nothing when there is no draft to record", async () => {
    // arrange
    const { database } = createDatabaseInserting();
    const inbox = new PostgresNotificationInbox({ database });

    // act
    await inbox.record({ drafts: [], at: ARRIVED_AT });

    // assert
    expect(database.insert).not.toHaveBeenCalled();
  });
});

function thenable(rows: readonly unknown[]) {
  return (onFulfilled: (value: readonly unknown[]) => unknown) =>
    Promise.resolve(rows).then(onFulfilled);
}

function createDatabaseSelecting(rows: readonly unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: thenable(rows),
  };
  const database = {
    select: vi.fn().mockReturnValue(chain),
  } as unknown as DatabaseClient;

  return { database, chain };
}

function createDatabaseUpdating(rows: readonly unknown[]) {
  const chain = {
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    then: thenable(rows),
  };
  const database = {
    update: vi.fn().mockReturnValue(chain),
  } as unknown as DatabaseClient;

  return { database, chain };
}

function createDatabaseInserting() {
  const chain = {
    values: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => chain),
    then: thenable([]),
  };
  const database = {
    insert: vi.fn().mockReturnValue(chain),
  } as unknown as DatabaseClient & { insert: ReturnType<typeof vi.fn> };

  return { database, chain };
}
