import type {
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  NotificationBell,
  ReadNotificationBellUseCase,
} from "@eli-coach-platform/domain/notification";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/bounded-contexts/access/accounts/server/accounts-composition.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { NotificationBellController } from "./notification-bell-controller.server";

const NOTIFICATION_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const CHECKED_AT = new Date("2026-10-15T09:00:00.000Z");
const ARRIVED_AT = new Date("2026-10-15T08:00:00.000Z");

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const COACH_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_eli", id: "acct_eli", role: "COACH" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const BELL: NotificationBell = {
  notifications: [
    {
      id: NOTIFICATION_ID,
      recipient: { party: "coach" },
      kind: "check-in.requested",
      facts: {
        checkInId: "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a",
        startsAt: "2026-10-17T15:00:00.000Z",
        clientName: "Ana Pop",
      },
      arrivedAt: ARRIVED_AT,
      readAt: null,
      unread: true,
    },
    {
      id: "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0",
      recipient: { party: "coach" },
      kind: "check-in.withdrawn",
      facts: { checkInId: "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a" },
      arrivedAt: ARRIVED_AT,
      readAt: CHECKED_AT,
      unread: false,
    },
  ],
  unreadCount: 1,
  checkedAt: CHECKED_AT,
};

describe("NotificationBellController loadBell", () => {
  it("reads the coach's bell as the coach", async () => {
    // arrange
    const { controller, readNotificationBell } = createController();

    // act
    await controller.loadBell(argsFor({ session: COACH_SESSION }));

    // assert
    expect(readNotificationBell).toHaveBeenCalledWith({ party: "coach" });
  });

  it("reads a client's bell by her sign-in", async () => {
    // arrange
    const { controller, readNotificationBell } = createController();

    // act
    await controller.loadBell(argsFor({ session: CLIENT_SESSION }));

    // assert
    expect(readNotificationBell).toHaveBeenCalledWith({
      party: "client",
      authSubjectId: "user_ana",
    });
  });

  it("answers the bell with instants and an unread flag instead of read instants", async () => {
    // arrange
    const { controller } = createController();

    // act
    const bell = await controller.loadBell(argsFor({ session: COACH_SESSION }));

    // assert
    expect(bell).toEqual({
      notifications: [
        {
          id: NOTIFICATION_ID,
          kind: "check-in.requested",
          facts: {
            checkInId: "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a",
            startsAt: "2026-10-17T15:00:00.000Z",
            clientName: "Ana Pop",
          },
          arrivedAt: "2026-10-15T08:00:00.000Z",
          unread: true,
        },
        {
          id: "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0",
          kind: "check-in.withdrawn",
          facts: { checkInId: "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a" },
          arrivedAt: "2026-10-15T08:00:00.000Z",
          unread: false,
        },
      ],
      unreadCount: 1,
      checkedAt: "2026-10-15T09:00:00.000Z",
    });
  });

  it("answers 401 to a visitor who is not signed in without reading any bell", async () => {
    // arrange
    const { controller, readNotificationBell } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadBell(argsFor({ session: ANONYMOUS_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(readNotificationBell).not.toHaveBeenCalled();
  });
});

describe("NotificationBellController respondWithBell", () => {
  it("answers the bell as JSON that is never cached", async () => {
    // arrange
    const { controller } = createController();

    // act
    const response = await controller.respondWithBell(
      argsFor({ session: CLIENT_SESSION }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      unreadCount: 1,
      checkedAt: "2026-10-15T09:00:00.000Z",
    });
  });
});

describe("NotificationBellController markRead", () => {
  it("marks the client's notification read and answers marked", async () => {
    // arrange
    const { controller, markNotificationRead } = createController();

    // act
    const response = await controller.markRead(
      argsFor({ session: CLIENT_SESSION }),
      NOTIFICATION_ID,
    );

    // assert
    expect(markNotificationRead).toHaveBeenCalledWith({
      reader: { party: "client", authSubjectId: "user_ana" },
      notificationId: NOTIFICATION_ID,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "marked" });
  });

  it("answers 404 for a notification that is not hers", async () => {
    // arrange
    const { controller } = createController({ marked: "unknown" });

    // act
    const response = await controller.markRead(
      argsFor({ session: CLIENT_SESSION }),
      NOTIFICATION_ID,
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "unknown_notification" });
  });

  it.each([
    { situation: "missing", notificationId: undefined },
    { situation: "not an identifier", notificationId: "not-an-id" },
  ])(
    "answers 404 without marking anything when the id is $situation",
    async ({ notificationId }) => {
      // arrange
      const { controller, markNotificationRead } = createController();

      // act
      const response = await controller.markRead(
        argsFor({ session: COACH_SESSION }),
        notificationId,
      );

      // assert
      expect(response.status).toBe(404);
      expect(markNotificationRead).not.toHaveBeenCalled();
    },
  );

  it("answers 401 to a visitor who is not signed in without marking anything", async () => {
    // arrange
    const { controller, markNotificationRead } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.markRead(
        argsFor({ session: ANONYMOUS_SESSION }),
        NOTIFICATION_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});

describe("NotificationBellController markAllRead", () => {
  it("marks every notification of the coach read and answers marked", async () => {
    // arrange
    const { controller, markAllNotificationsRead } = createController();

    // act
    const response = await controller.markAllRead(
      argsFor({ session: COACH_SESSION }),
    );

    // assert
    expect(markAllNotificationsRead).toHaveBeenCalledWith({ party: "coach" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "marked" });
  });

  it("answers 404 to a client the bell does not reach", async () => {
    // arrange
    const { controller } = createController({ allMarked: "unknown" });

    // act
    const response = await controller.markAllRead(
      argsFor({ session: CLIENT_SESSION }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "unknown_notification" });
  });
});

function createController(
  answers: {
    marked?: "marked" | "unknown";
    allMarked?: "marked" | "unknown";
  } = {},
) {
  const readNotificationBell = vi.fn().mockResolvedValue(BELL);
  const markNotificationRead = vi
    .fn()
    .mockResolvedValue(answers.marked ?? "marked");
  const markAllNotificationsRead = vi
    .fn()
    .mockResolvedValue(answers.allMarked ?? "marked");
  const controller = new NotificationBellController({
    markAllNotificationsRead: {
      execute: markAllNotificationsRead,
    } as unknown as MarkAllNotificationsReadUseCase,
    markNotificationRead: {
      execute: markNotificationRead,
    } as unknown as MarkNotificationReadUseCase,
    readNotificationBell: {
      execute: readNotificationBell,
    } as unknown as ReadNotificationBellUseCase,
  });

  return {
    controller,
    markAllNotificationsRead,
    markNotificationRead,
    readNotificationBell,
  };
}

function argsFor(options: { session: ResolvedSession }) {
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
      contextEntry(sessionContext, options.session),
    ],
    request: new Request("https://evoa.fit/api/notifications"),
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
