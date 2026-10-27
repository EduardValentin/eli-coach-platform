import type {
  ClientJourneySnapshot,
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { ClientCheckIn } from "~/bounded-contexts/clients/check-ins/public/check-ins";
import type { CheckInsFeature } from "~/bounded-contexts/clients/check-ins/server/check-ins-composition.server";
import { checkInsContext } from "~/bounded-contexts/clients/check-ins/server/guards/check-ins-context.server";
import type { ClientProfileFeature } from "~/bounded-contexts/clients/client-profile/server/client-profile-composition.server";
import { clientProfileContext } from "~/bounded-contexts/clients/client-profile/server/guards/client-profile-context.server";
import type { ClientResourcesFeature } from "~/bounded-contexts/clients/client-resources/server/client-resources-composition.server";
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/server/guards/client-resources-context.server";
import { ClientJourneyController } from "~/bounded-contexts/clients/clients/api/client/client-journey-controller.server";
import type { ClientsFeature } from "~/bounded-contexts/clients/clients/server/clients-composition.server";
import { clientJourneyContext } from "~/bounded-contexts/clients/clients/server/guards/client-journey-context.server";
import { clientsContext } from "~/bounded-contexts/clients/clients/server/guards/clients-context.server";
import type { NotificationBellReply } from "~/bounded-contexts/clients/notifications/public/notifications";
import { notificationsContext } from "~/bounded-contexts/clients/notifications/server/guards/notifications-context.server";
import type { NotificationsFeature } from "~/bounded-contexts/clients/notifications/server/notifications-composition.server";
import {
  contextEntry,
  createRequestArgs,
  type ContextEntry,
} from "~/composition-root/test-support/request-args";

import { loader, shouldRevalidate } from "./layout";

const ANA: ClientJourneySnapshot = {
  clientId: "client_ana",
  firstName: "Ana",
  gender: "female",
  lastName: "Popescu",
  welcomeSeenAt: null,
  onboardingSubmittedAt: null,
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
  standing: {
    status: "not-started",
    accessEndsAt: null,
    refundDue: false,
    bundleMonths: null,
    programStartsAt: null,
    paidThrough: null,
  },
};

const NEXT_CHECK_IN: ClientCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  seriesId: null,
  kind: "ad_hoc",
  status: "approved",
  tab: "upcoming",
  initiatedBy: "client",
  proposedBy: "client",
  awaitsViewer: false,
  viewerMayWithdraw: false,
  viewerProposal: "allowed",
  viewerMayCancel: true,
  newTimeWaits: false,
  isWaitingRequest: false,
  startsAt: "2026-10-14T07:00:00.000Z",
  endsAt: "2026-10-14T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-14T06:50:00.000Z",
  earlierStartsAt: null,
  moves: 0,
  note: null,
  newTimeNote: null,
};

const EMPTY_BELL: NotificationBellReply = {
  notifications: [],
  unreadCount: 0,
  checkedAt: "2026-10-15T12:00:00.000Z",
};

const UNREAD_BELL: NotificationBellReply = {
  notifications: [
    {
      id: "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
      kind: "check-in.approved",
      facts: {
        checkInId: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
        startsAt: "2026-10-14T07:00:00.000Z",
      },
      arrivedAt: "2026-10-13T07:00:00.000Z",
      unread: true,
    },
  ],
  unreadCount: 1,
  checkedAt: "2026-10-13T08:00:00.000Z",
};

describe("client shell loader", () => {
  it("names the client the gate handed over, reads her picture, her next check-in and her notification bell and counts the resources she has not opened and the check-ins waiting for her", async () => {
    // arrange
    const avatarUrl = vi
      .fn()
      .mockResolvedValue("/api/client-profile/avatar/client_ana?v=avatar-1");
    const countUnopened = vi.fn().mockResolvedValue(2);
    const loadAwaitingCount = vi.fn().mockResolvedValue(3);
    const loadNextCheckIn = vi.fn().mockResolvedValue(NEXT_CHECK_IN);
    const loadBell = vi.fn().mockResolvedValue(UNREAD_BELL);
    const args = shellArguments([contextEntry(clientJourneyContext, ANA)], {
      avatarUrl,
      countUnopened,
      loadAwaitingCount,
      loadBell,
      loadNextCheckIn,
    });

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({
      avatarUrl: "/api/client-profile/avatar/client_ana?v=avatar-1",
      presentation: {
        displayName: "Ana Popescu",
        greeting: "Welcome back, Ana.",
      },
      nextCheckIn: NEXT_CHECK_IN,
      unopenedResources: 2,
      checkInsAwaiting: 3,
      bell: UNREAD_BELL,
    });
    expect(avatarUrl).toHaveBeenCalledWith(args);
    expect(loadBell).toHaveBeenCalledWith(args);
    expect(countUnopened).toHaveBeenCalledWith(args);
    expect(loadAwaitingCount).toHaveBeenCalledWith(args);
    expect(loadNextCheckIn).toHaveBeenCalledWith(args);
  });

  it("hands over no next check-in while she has none coming", async () => {
    // arrange
    const args = shellArguments([contextEntry(clientJourneyContext, ANA)]);

    // act
    const shell = await loader(args);

    // assert
    expect(shell.nextCheckIn).toBeNull();
  });

  it("falls back to the quiet greeting for an account with no client record", async () => {
    // arrange
    const args = shellArguments([contextEntry(clientJourneyContext, null)]);

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({
      avatarUrl: null,
      presentation: { displayName: "Client", greeting: "Welcome back." },
      nextCheckIn: null,
      unopenedResources: 0,
      checkInsAwaiting: 0,
      bell: EMPTY_BELL,
    });
  });

  it("refuses to render, without reading anything, when the access layout's gate never ran", async () => {
    // arrange
    const avatarUrl = vi.fn().mockResolvedValue(null);
    const countUnopened = vi.fn().mockResolvedValue(0);
    const loadAwaitingCount = vi.fn().mockResolvedValue(0);
    const loadNextCheckIn = vi.fn().mockResolvedValue(null);
    const loadBell = vi.fn().mockResolvedValue(EMPTY_BELL);
    const args = shellArguments([], {
      avatarUrl,
      countUnopened,
      loadAwaitingCount,
      loadBell,
      loadNextCheckIn,
    });

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toThrow();
    expect(avatarUrl).not.toHaveBeenCalled();
    expect(countUnopened).not.toHaveBeenCalled();
    expect(loadAwaitingCount).not.toHaveBeenCalled();
    expect(loadNextCheckIn).not.toHaveBeenCalled();
    expect(loadBell).not.toHaveBeenCalled();
  });
});

describe("client shell revalidation", () => {
  it("re-reads the shell when she moves to another page of her portal", () => {
    // arrange
    const childNavigation = {
      currentUrl: new URL("https://evoa.fit/client"),
      defaultShouldRevalidate: false,
      nextUrl: new URL("https://evoa.fit/client/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(childNavigation);

    // assert
    expect(revalidates).toBe(true);
  });

  it("keeps the shell when a submission on the same page opts out of revalidation", () => {
    // arrange
    const optedOutSubmission = {
      currentUrl: new URL("https://evoa.fit/client/checkins"),
      defaultShouldRevalidate: false,
      nextUrl: new URL("https://evoa.fit/client/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(optedOutSubmission);

    // assert
    expect(revalidates).toBe(false);
  });

  it("re-reads the shell whenever React Router would by default", () => {
    // arrange
    const submission = {
      currentUrl: new URL("https://evoa.fit/client/checkins"),
      defaultShouldRevalidate: true,
      nextUrl: new URL("https://evoa.fit/client/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(submission);

    // assert
    expect(revalidates).toBe(true);
  });
});

function shellArguments(
  journeyEntries: readonly ContextEntry[],
  reads: {
    avatarUrl?: ReturnType<typeof vi.fn>;
    countUnopened?: ReturnType<typeof vi.fn>;
    loadAwaitingCount?: ReturnType<typeof vi.fn>;
    loadBell?: ReturnType<typeof vi.fn>;
    loadNextCheckIn?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const {
    avatarUrl = vi.fn().mockResolvedValue(null),
    countUnopened = vi.fn().mockResolvedValue(0),
    loadAwaitingCount = vi.fn().mockResolvedValue(0),
    loadBell = vi.fn().mockResolvedValue(EMPTY_BELL),
    loadNextCheckIn = vi.fn().mockResolvedValue(null),
  } = reads;
  const clientJourney = new ClientJourneyController({
    markWelcomeSeen: {} as MarkWelcomeSeenUseCase,
    readClientJourney: {} as ReadClientJourneyUseCase,
  });

  return createRequestArgs({
    contexts: [
      contextEntry(clientsContext, {
        clientJourney,
      } as unknown as ClientsFeature),
      contextEntry(clientProfileContext, {
        ownAvatar: { url: avatarUrl },
      } as unknown as ClientProfileFeature),
      contextEntry(clientResourcesContext, {
        ownResources: { countUnopened },
      } as unknown as ClientResourcesFeature),
      contextEntry(checkInsContext, {
        clientCheckIns: { loadAwaitingCount, loadNextCheckIn },
      } as unknown as CheckInsFeature),
      contextEntry(notificationsContext, {
        notificationBell: { loadBell },
      } as unknown as NotificationsFeature),
      ...journeyEntries,
    ],
    request: new Request("https://evoa.fit/client"),
  });
}
