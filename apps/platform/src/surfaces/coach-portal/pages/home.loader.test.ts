import { describe, expect, it, vi } from "vitest";

import type { AssessmentCallsFeature } from "~/features/assessment-calls/server/assessment-calls-composition.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./home";

const LISTING = {
  calls: [],
  coachTimeZone: "Europe/Bucharest",
  now: "2026-09-20T09:00:00.000Z",
};

describe("coach dashboard loader", () => {
  it("reads the same call listing the assessment calls page reads", async () => {
    // arrange
    const loadCalls = vi.fn().mockResolvedValue(LISTING);

    // act
    const loaded = loader(createLoaderArguments(loadCalls));

    // assert
    await expect(loaded).resolves.toEqual(LISTING);
  });

  it("leaves the denial the portal middleware raises alone", async () => {
    // arrange
    const loadCalls = vi
      .fn()
      .mockRejectedValue(new Response("Forbidden", { status: 403 }));

    // act
    const loading = loader(createLoaderArguments(loadCalls));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 403 });
  });
});

function createLoaderArguments(loadCalls: ReturnType<typeof vi.fn>) {
  const feature = {
    coachAssessmentCalls: { loadCalls },
  } as unknown as AssessmentCallsFeature;

  return createRequestArgs({
    contexts: [contextEntry(assessmentCallsContext, feature)],
    request: new Request("http://localhost/coach/"),
  });
}
