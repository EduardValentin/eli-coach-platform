import type {
  ClientJourneySnapshot,
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadProgramStatusUseCase,
} from "@eli-coach-platform/domain/client-journey";
import { describe, expect, it, vi } from "vitest";

import type { ClientResourcesFeature } from "~/features/client-resources/server/client-resources-composition.server";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import { ClientJourneyController } from "~/features/coaching-sales/api/client/client-journey-controller.server";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { clientJourneyContext } from "~/features/coaching-sales/server/guards/client-journey-context.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
  type ContextEntry,
} from "~/server/test-support/request-args";

import { loader } from "./layout";

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
};

describe("client shell loader", () => {
  it("names the client the gate handed over and counts the resources she has not opened", async () => {
    // arrange
    const countUnopened = vi.fn().mockResolvedValue(2);
    const args = shellArguments(
      [contextEntry(clientJourneyContext, ANA)],
      countUnopened,
    );

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({
      presentation: {
        displayName: "Ana Popescu",
        greeting: "Welcome back, Ana.",
      },
      unopenedResources: 2,
    });
    expect(countUnopened).toHaveBeenCalledWith(args);
  });

  it("falls back to the quiet greeting for an account with no client record", async () => {
    // arrange
    const args = shellArguments([contextEntry(clientJourneyContext, null)]);

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({
      presentation: { displayName: "Client", greeting: "Welcome back." },
      unopenedResources: 0,
    });
  });

  it("refuses to render, without counting anything, when the access layout's gate never ran", async () => {
    // arrange
    const countUnopened = vi.fn().mockResolvedValue(0);
    const args = shellArguments([], countUnopened);

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toThrow();
    expect(countUnopened).not.toHaveBeenCalled();
  });
});

function shellArguments(
  journeyEntries: readonly ContextEntry[],
  countUnopened = vi.fn().mockResolvedValue(0),
) {
  const clientJourney = new ClientJourneyController({
    markWelcomeSeen: {} as MarkWelcomeSeenUseCase,
    readClientJourney: {} as ReadClientJourneyUseCase,
    readProgramStatus: {} as ReadProgramStatusUseCase,
  });

  return createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, {
        clientJourney,
      } as unknown as CoachingSalesFeature),
      contextEntry(clientResourcesContext, {
        ownResources: { countUnopened },
      } as unknown as ClientResourcesFeature),
      ...journeyEntries,
    ],
    request: new Request("https://evoa.fit/client"),
  });
}
