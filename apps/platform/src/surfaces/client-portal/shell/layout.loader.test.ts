import type {
  ClientJourneySnapshot,
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadProgramStatusUseCase,
} from "@eli-coach-platform/domain/client-journey";
import { describe, expect, it } from "vitest";

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
  it("names the client the gate handed over", () => {
    // arrange
    const args = shellArguments([contextEntry(clientJourneyContext, ANA)]);

    // act
    const presentation = loader(args);

    // assert
    expect(presentation).toEqual({
      displayName: "Ana Popescu",
      greeting: "Welcome back, Ana.",
    });
  });

  it("falls back to the quiet greeting for an account with no client record", () => {
    // arrange
    const args = shellArguments([contextEntry(clientJourneyContext, null)]);

    // act
    const presentation = loader(args);

    // assert
    expect(presentation).toEqual({
      displayName: "Client",
      greeting: "Welcome back.",
    });
  });

  it("refuses to render when the access layout's gate never ran", () => {
    // arrange
    const args = shellArguments([]);

    // act
    const loading = () => loader(args);

    // assert
    expect(loading).toThrow();
  });
});

function shellArguments(journeyEntries: readonly ContextEntry[]) {
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
      ...journeyEntries,
    ],
    request: new Request("https://evoa.fit/client"),
  });
}
