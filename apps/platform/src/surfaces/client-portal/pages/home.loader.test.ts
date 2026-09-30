import { describe, expect, it, vi } from "vitest";

import type { ClientOnboardingFeature } from "~/features/client-onboarding/server/client-onboarding-composition.server";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./home";

describe("client dashboard loader", () => {
  it("loads her program status from the client journey and her open details request from her onboarding", async () => {
    // arrange
    const { args, clientJourney, controller, programStatus } = routeArguments();
    controller.loadOpenRequest.mockResolvedValue({
      note: "Which day suits you best now?",
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      detailsRequest: { note: "Which day suits you best now?" },
      programStatus,
    });
    expect(clientJourney.loadProgramStatus).toHaveBeenCalledWith(args);
    expect(controller.loadOpenRequest).toHaveBeenCalledWith(args);
  });

  it("hands her no card when she has no program status yet", async () => {
    // arrange
    const { args, clientJourney } = routeArguments();
    clientJourney.loadProgramStatus.mockResolvedValue(null);

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({ detailsRequest: null, programStatus: null });
  });
});

function routeArguments() {
  const programStatus = {
    kind: "submitted" as const,
    submittedAt: "2026-10-01T09:00:00.000Z",
    workStartsOn: null,
  };
  const clientJourney = {
    loadProgramStatus: vi.fn().mockResolvedValue(programStatus),
  };
  const controller = {
    loadOpenRequest: vi.fn().mockResolvedValue(null),
  };
  const args = createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, {
        clientJourney,
      } as unknown as CoachingSalesFeature),
      contextEntry(clientOnboardingContext, {
        controller,
      } as unknown as ClientOnboardingFeature),
    ],
    request: new Request("https://evoa.fit/client"),
  });

  return { args, clientJourney, controller, programStatus };
}
