import type { DatabaseClient } from "~/shared/database";
import type { AccountSnapshot } from "~/bounded-contexts/access/accounts/domain/account";
import type {
  NotificationExpirySource,
  NotificationInbox,
  NotificationIncidents,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import { describe, expect, it, vi } from "vitest";

import {
  type AccountsFeature,
  accountsContext,
} from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import { sessionContext } from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import { PostgresNotificationInbox } from "~/bounded-contexts/clients/notifications/adapters/outbound/persistence/postgres-notification-inbox.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import {
  composeNotificationInbox,
  composeNotificationsFeature,
} from "./composition.server";

const COACH: AccountSnapshot = {
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
    incidents: {
      notificationBellReadFailed: vi.fn(),
      notificationExpiriesFailed: vi.fn(),
    } satisfies NotificationIncidents,
  };
}

function coachArgs() {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, { account: COACH, kind: "authenticated" }),
    ],
    request: new Request("https://evoa.fit/api/notifications"),
  });
}
