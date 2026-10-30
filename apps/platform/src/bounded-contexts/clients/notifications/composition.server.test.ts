import type { DatabaseClient } from "~/shared/database";
import type { NotificationInboxPort } from "~/bounded-contexts/clients/notifications/domain/notification";
import { describe, expect, it, vi } from "vitest";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import type { SessionAccount } from "~/bounded-contexts/access/public/session";

import { PostgresNotificationInboxRepository } from "~/bounded-contexts/clients/notifications/adapters/outbound/persistence/postgres-notification-inbox-repository.server";
import { createRequestArgs } from "~/composition-root/test-support/request-args";

import {
  composeNotificationInbox,
  composeNotificationsFeature,
} from "./composition.server";

const COACH: SessionAccount = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const NOW = new Date("2026-10-15T09:00:00.000Z");

describe("composeNotificationInbox", () => {
  it("hands out the Postgres inbox every writer and the bell share", () => {
    // arrange
    const database = {} as DatabaseClient;

    // act
    const { handles } = composeNotificationInbox({ database });

    // assert
    expect(handles.inbox).toBeInstanceOf(PostgresNotificationInboxRepository);
  });
});

describe("composeNotificationsFeature", () => {
  it("reads the bell from the inbox it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNotificationsFeature(handles);

    // act
    const bell = await feature.notificationBell.loadBell(coachArgs());

    // assert
    expect(handles.inbox.latestFor).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: { party: "coach" }, at: NOW }),
    );
    expect(bell).toEqual({
      notifications: [],
      unreadCount: 2,
      checkedAt: NOW.toISOString(),
    });
  });

  it("marks the coach's notifications read through the inbox it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNotificationsFeature(handles);

    // act
    const response = await feature.notificationBell.markAllRead(coachArgs());

    // assert
    expect(response.status).toBe(200);
    expect(handles.inbox.markAllRead).toHaveBeenCalledWith({
      recipient: { party: "coach" },
      at: NOW,
    });
  });
});

function createHandles() {
  const inbox = {
    record: vi.fn().mockResolvedValue(undefined),
    withdrawUnarrived: vi.fn().mockResolvedValue(undefined),
    latestFor: vi.fn().mockResolvedValue([]),
    unreadCountFor: vi.fn().mockResolvedValue(2),
    markRead: vi.fn().mockResolvedValue("marked"),
    markAllRead: vi.fn().mockResolvedValue(undefined),
  } satisfies NotificationInboxPort;

  return {
    clientReach: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    clock: { now: () => NOW },
    inbox,
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    } satisfies LoggerPort,
  };
}

function coachArgs() {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };

  return createRequestArgs({
    portal,
    session: { account: COACH, kind: "authenticated" },
    request: new Request("https://evoa.fit/api/notifications"),
  });
}
