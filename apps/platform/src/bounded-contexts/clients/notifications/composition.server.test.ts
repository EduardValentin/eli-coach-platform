import type { DatabaseClient } from "~/shared/database";
import type {
  NotificationExpirySource,
  NotificationInbox,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import { describe, expect, it, vi } from "vitest";
import type { Logger } from "~/shared/logging/console-logger.server";
import type { SessionAccount } from "~/bounded-contexts/access/public/session";

import { PostgresNotificationInbox } from "~/bounded-contexts/clients/notifications/adapters/outbound/persistence/postgres-notification-inbox.server";
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
    expect(handles.inbox).toBeInstanceOf(PostgresNotificationInbox);
  });
});

describe("composeNotificationsFeature", () => {
  it("reads the bell from the inbox it is handed after recording what the expiry sources found", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNotificationsFeature(handles);

    // act
    const bell = await feature.notificationBell.loadBell(coachArgs());

    // assert
    expect(handles.expirySources[0]?.expiredFor).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: { party: "coach" }, at: NOW }),
    );
    expect(handles.inbox.latestFor).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: { party: "coach" } }),
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
    latestFor: vi.fn().mockResolvedValue([]),
    unreadCountFor: vi.fn().mockResolvedValue(2),
    markRead: vi.fn().mockResolvedValue("marked"),
    markAllRead: vi.fn().mockResolvedValue(undefined),
  } satisfies NotificationInbox;
  const expirySource = {
    expiredFor: vi.fn().mockResolvedValue([]),
  } satisfies NotificationExpirySource;

  return {
    clientReach: { findByAuthSubjectId: vi.fn().mockResolvedValue(null) },
    clock: { now: () => NOW },
    expirySources: [expirySource],
    inbox,
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } satisfies Logger,
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
