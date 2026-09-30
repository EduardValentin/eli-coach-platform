import { describe, expect, it, vi } from "vitest";

import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./home";

describe("client dashboard loader", () => {
  it("loads her program status from the client journey", async () => {
    // arrange
    const { args, clientJourney, programStatus } = routeArguments();

    // act
    const status = await loader(args);

    // assert
    expect(status).toBe(programStatus);
    expect(clientJourney.loadProgramStatus).toHaveBeenCalledWith(args);
  });

  it("hands her no card when she has no program status yet", async () => {
    // arrange
    const { args, clientJourney } = routeArguments();
    clientJourney.loadProgramStatus.mockResolvedValue(null);

    // act
    const status = await loader(args);

    // assert
    expect(status).toBeNull();
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
  const args = createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, {
        clientJourney,
      } as unknown as CoachingSalesFeature),
    ],
    request: new Request("https://evoa.fit/client"),
  });

  return { args, clientJourney, programStatus };
}
