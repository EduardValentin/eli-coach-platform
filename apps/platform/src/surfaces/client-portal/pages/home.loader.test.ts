import { describe, expect, it, vi } from "vitest";

import {
  type ClientOnboardingFeature,
  clientOnboardingContext,
  type ClientProfileFeature,
  clientProfileContext,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
import {
  type CoachingSalesFeature,
  coachingSalesContext,
} from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader } from "./home";

describe("client dashboard loader", () => {
  it("loads her program status from her subscription, her open details request from her onboarding and what measurements are due from her profile", async () => {
    // arrange
    const {
      args,
      subscription,
      clientMeasurements,
      controller,
      programStatus,
    } = routeArguments();
    clientMeasurements.loadNudge.mockResolvedValue({ dueLine: "weigh-in" });
    controller.loadOpenRequest.mockResolvedValue({
      note: "Which day suits you best now?",
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      detailsRequest: { note: "Which day suits you best now?" },
      dueLine: "weigh-in",
      programStatus,
    });
    expect(subscription.loadProgramStatus).toHaveBeenCalledWith(args);
    expect(controller.loadOpenRequest).toHaveBeenCalledWith(args);
    expect(clientMeasurements.loadNudge).toHaveBeenCalledWith(args);
  });

  it("hands her no card when she has no program status yet", async () => {
    // arrange
    const { args, subscription } = routeArguments();
    subscription.loadProgramStatus.mockResolvedValue(null);

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      detailsRequest: null,
      dueLine: null,
      programStatus: null,
    });
  });
});

function routeArguments() {
  const programStatus = {
    kind: "submitted" as const,
    submittedAt: "2026-10-01T09:00:00.000Z",
    workStartsOn: null,
  };
  const subscription = {
    loadProgramStatus: vi.fn().mockResolvedValue(programStatus),
  };
  const controller = {
    loadOpenRequest: vi.fn().mockResolvedValue(null),
  };
  const clientMeasurements = {
    loadNudge: vi.fn().mockResolvedValue({ dueLine: null }),
  };
  const args = createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, {
        subscription,
      } as unknown as CoachingSalesFeature),
      contextEntry(clientOnboardingContext, {
        controller,
      } as unknown as ClientOnboardingFeature),
      contextEntry(clientProfileContext, {
        clientMeasurements,
      } as unknown as ClientProfileFeature),
    ],
    request: new Request("https://evoa.fit/client"),
  });

  return { args, subscription, clientMeasurements, controller, programStatus };
}
