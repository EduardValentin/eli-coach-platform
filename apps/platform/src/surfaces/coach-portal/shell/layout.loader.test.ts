import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  checkInsContext,
  type CheckInsFeature,
  notificationsContext,
  type NotificationsFeature,
} from "~/bounded-contexts/clients/public/request-context";
import type { NotificationBellReply } from "~/bounded-contexts/clients/notifications/public/notifications";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader, shouldRevalidate } from "./layout";

const BELL: NotificationBellReply = {
  notifications: [
    {
      id: "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
      kind: "check-in.requested",
      facts: {
        checkInId: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
        startsAt: "2026-10-16T15:00:00.000Z",
        clientName: "Jane Doe",
      },
      arrivedAt: "2026-10-15T11:00:00.000Z",
      unread: true,
    },
  ],
  unreadCount: 1,
  checkedAt: "2026-10-15T12:00:00.000Z",
};

describe("coach shell loader", () => {
  it("counts the check-ins waiting for the coach's answer and reads her notification bell", async () => {
    // arrange
    const loadAwaitingCount = vi.fn().mockResolvedValue(4);
    const loadBell = vi.fn().mockResolvedValue(BELL);
    const args = createRequestArgs({
      contexts: [
        contextEntry(checkInsContext, {
          coachCheckInsController: { loadAwaitingCount },
        } as unknown as CheckInsFeature),
        contextEntry(notificationsContext, {
          notificationBellController: { loadBell },
        } as unknown as NotificationsFeature),
      ],
      request: new Request("https://evoa.fit/coach"),
    });

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({ checkInsAwaiting: 4, bell: BELL });
    expect(loadAwaitingCount).toHaveBeenCalledWith(args);
    expect(loadBell).toHaveBeenCalledWith(args);
  });
});

describe("coach shell revalidation", () => {
  it("re-reads the count when she moves to another coach page", () => {
    // arrange
    const navigation = {
      currentUrl: new URL("https://evoa.fit/coach"),
      defaultShouldRevalidate: false,
      nextUrl: new URL("https://evoa.fit/coach/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(navigation);

    // assert
    expect(revalidates).toBe(true);
  });

  it("keeps the count when a submission on the same page opts out of revalidation", () => {
    // arrange
    const submission = {
      currentUrl: new URL("https://evoa.fit/coach/checkins"),
      defaultShouldRevalidate: false,
      formMethod: "POST",
      nextUrl: new URL("https://evoa.fit/coach/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(submission);

    // assert
    expect(revalidates).toBe(false);
  });

  it("re-reads the count after a submission that revalidates as usual", () => {
    // arrange
    const submission = {
      currentUrl: new URL("https://evoa.fit/coach/checkins"),
      defaultShouldRevalidate: true,
      formMethod: "POST",
      nextUrl: new URL("https://evoa.fit/coach/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(submission);

    // assert
    expect(revalidates).toBe(true);
  });
});
