import { describe, expect, it, vi } from "vitest";

import type { AssessmentCallsFeature } from "~/features/assessment-calls/server/assessment-calls-composition.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./join-page";

const BOOKING_ID = "3f1e8d0c-2a44-4f6e-9a2b-7c0d5e6f8a91";

describe("assessment call join loader", () => {
  it("sends a booked visitor straight to the meeting room", async () => {
    // arrange
    const resolveJoin = vi
      .fn()
      .mockResolvedValue({ status: "found", url: "https://meet.example/eli" });

    // act
    const loading = loader(createLoaderArguments(resolveJoin, BOOKING_ID));

    // assert
    await expect(captureRedirect(loading)).resolves.toEqual({
      location: "https://meet.example/eli",
      status: 302,
    });
    expect(resolveJoin).toHaveBeenCalledWith(BOOKING_ID);
  });

  it("answers a known booking with no saved meeting link as not ready", async () => {
    // arrange
    const resolveJoin = vi.fn().mockResolvedValue({ status: "link_not_set" });

    // act
    const result = await loader(createLoaderArguments(resolveJoin, BOOKING_ID));

    // assert
    expect(result).toEqual({ status: "link_not_set" });
  });

  it("answers an unknown booking as not found", async () => {
    // arrange
    const resolveJoin = vi.fn().mockResolvedValue({ status: "unknown" });

    // act
    const loading = loader(createLoaderArguments(resolveJoin, BOOKING_ID));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("answers a request without a booking id as not found", async () => {
    // arrange
    const resolveJoin = vi.fn();

    // act
    const loading = loader(createLoaderArguments(resolveJoin));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(resolveJoin).not.toHaveBeenCalled();
  });
});

async function captureRedirect(loading: Promise<unknown>) {
  const thrown = await loading.then(
    () => null,
    (redirected: Response) => redirected,
  );

  if (!(thrown instanceof Response)) {
    throw new Error("Expected the loader to throw a redirect response.");
  }

  return { location: thrown.headers.get("Location"), status: thrown.status };
}

function createLoaderArguments(
  resolveJoin: ReturnType<typeof vi.fn>,
  bookingId?: string,
) {
  const feature = {
    assessmentCalls: { resolveJoin },
  } as unknown as AssessmentCallsFeature;

  return createRequestArgs({
    contexts: [contextEntry(assessmentCallsContext, feature)],
    params: bookingId ? { bookingId } : {},
    request: new Request(`http://localhost/book/${bookingId ?? ""}/join`),
  });
}
