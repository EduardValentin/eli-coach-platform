import { describe, expect, it, vi } from "vitest";

import {
  assessmentCallsContext,
  type AssessmentCallsFeature,
} from "~/bounded-contexts/scheduling/public/request-context";
import {
  checkInsContext,
  type CheckInsFeature,
} from "~/bounded-contexts/clients/public/request-context";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader } from "./home";

const LISTING = {
  calls: [],
  coachTimeZone: "Europe/Bucharest",
  now: "2026-09-20T09:00:00.000Z",
};

const PENDING_CHECK_INS = { checkIns: [] };

describe("coach dashboard loader", () => {
  it("reads the call listing beside the check-ins waiting for her answer", async () => {
    // arrange
    const loadCalls = vi.fn().mockResolvedValue(LISTING);
    const loadAwaiting = vi.fn().mockResolvedValue(PENDING_CHECK_INS);
    const args = createLoaderArguments({ loadAwaiting, loadCalls });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      listing: LISTING,
      pendingCheckIns: PENDING_CHECK_INS,
    });
    expect(loadAwaiting).toHaveBeenCalledWith(args);
  });

  it("leaves the denial the portal middleware raises alone", async () => {
    // arrange
    const loadCalls = vi
      .fn()
      .mockRejectedValue(new Response("Forbidden", { status: 403 }));
    const loadAwaiting = vi.fn().mockResolvedValue(PENDING_CHECK_INS);

    // act
    const loading = loader(createLoaderArguments({ loadAwaiting, loadCalls }));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 403 });
  });

  it("leaves the 503 the controller raises when the calls cannot be read alone", async () => {
    // arrange
    const loadCalls = vi
      .fn()
      .mockRejectedValue(new Response("unavailable", { status: 503 }));
    const loadAwaiting = vi.fn().mockResolvedValue(PENDING_CHECK_INS);

    // act
    const loading = loader(createLoaderArguments({ loadAwaiting, loadCalls }));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 503 });
  });
});

function createLoaderArguments(reads: {
  loadAwaiting: ReturnType<typeof vi.fn>;
  loadCalls: ReturnType<typeof vi.fn>;
}) {
  const assessmentCalls = {
    coachAssessmentCalls: { loadCalls: reads.loadCalls },
  } as unknown as AssessmentCallsFeature;
  const checkIns = {
    coachCheckIns: { loadAwaiting: reads.loadAwaiting },
  } as unknown as CheckInsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(assessmentCallsContext, assessmentCalls),
      contextEntry(checkInsContext, checkIns),
    ],
    request: new Request("http://localhost/coach/"),
  });
}
