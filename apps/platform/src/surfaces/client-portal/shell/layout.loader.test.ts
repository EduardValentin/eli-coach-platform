import type {
  ClientJourneySnapshot,
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
} from "@eli-coach-platform/domain/client-journey";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { ClientCheckIn } from "~/features/check-ins/public/check-ins";
import type { CheckInsFeature } from "~/features/check-ins/server/check-ins-composition.server";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import type { ClientResourcesFeature } from "~/features/client-resources/server/client-resources-composition.server";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import { ClientJourneyController } from "~/features/clients/api/client/client-journey-controller.server";
import type { ClientsFeature } from "~/features/clients/server/clients-composition.server";
import { clientJourneyContext } from "~/features/clients/server/guards/client-journey-context.server";
import { clientsContext } from "~/features/clients/server/guards/clients-context.server";
import {
  contextEntry,
  createRequestArgs,
  type ContextEntry,
} from "~/server/test-support/request-args";

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
  },
};

const NEXT_CHECK_IN: ClientCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  kind: "ad_hoc",
  status: "approved",
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

describe("client shell loader", () => {
  it("names the client the gate handed over, reads her next check-in and counts the resources she has not opened and the check-ins waiting for her", async () => {
    // arrange
    const countUnopened = vi.fn().mockResolvedValue(2);
    const loadAwaitingCount = vi.fn().mockResolvedValue(3);
    const loadNextCheckIn = vi.fn().mockResolvedValue(NEXT_CHECK_IN);
    const args = shellArguments([contextEntry(clientJourneyContext, ANA)], {
      countUnopened,
      loadAwaitingCount,
      loadNextCheckIn,
    });

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({
      presentation: {
        displayName: "Ana Popescu",
        greeting: "Welcome back, Ana.",
      },
      nextCheckIn: NEXT_CHECK_IN,
      unopenedResources: 2,
      checkInsAwaiting: 3,
    });
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
      presentation: { displayName: "Client", greeting: "Welcome back." },
      nextCheckIn: null,
      unopenedResources: 0,
      checkInsAwaiting: 0,
    });
  });

  it("refuses to render, without reading anything, when the access layout's gate never ran", async () => {
    // arrange
    const countUnopened = vi.fn().mockResolvedValue(0);
    const loadAwaitingCount = vi.fn().mockResolvedValue(0);
    const loadNextCheckIn = vi.fn().mockResolvedValue(null);
    const args = shellArguments([], {
      countUnopened,
      loadAwaitingCount,
      loadNextCheckIn,
    });

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toThrow();
    expect(countUnopened).not.toHaveBeenCalled();
    expect(loadAwaitingCount).not.toHaveBeenCalled();
    expect(loadNextCheckIn).not.toHaveBeenCalled();
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
    countUnopened?: ReturnType<typeof vi.fn>;
    loadAwaitingCount?: ReturnType<typeof vi.fn>;
    loadNextCheckIn?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const {
    countUnopened = vi.fn().mockResolvedValue(0),
    loadAwaitingCount = vi.fn().mockResolvedValue(0),
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
      contextEntry(clientResourcesContext, {
        ownResources: { countUnopened },
      } as unknown as ClientResourcesFeature),
      contextEntry(checkInsContext, {
        clientCheckIns: { loadAwaitingCount, loadNextCheckIn },
      } as unknown as CheckInsFeature),
      ...journeyEntries,
    ],
    request: new Request("https://evoa.fit/client"),
  });
}
