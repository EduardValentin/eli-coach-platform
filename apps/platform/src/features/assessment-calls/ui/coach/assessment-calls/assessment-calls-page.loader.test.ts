import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { AssessmentCallsFeature } from "~/features/assessment-calls/server/assessment-calls-composition.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, shouldRevalidate } from "./assessment-calls-page";

const LISTING = {
  calls: [],
  coachTimeZone: "Europe/Bucharest",
  now: "2026-09-20T09:00:00.000Z",
};

const CALLS_URL = "http://localhost/coach/assessment-calls";

describe("coach assessment calls page loader", () => {
  it("carries every booked call into the server-rendered page", async () => {
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

  it("leaves the 503 the controller raises when the calls cannot be read alone", async () => {
    // arrange
    const loadCalls = vi
      .fn()
      .mockRejectedValue(new Response("unavailable", { status: 503 }));

    // act
    const loading = loader(createLoaderArguments(loadCalls));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 503 });
  });
});

describe("coach assessment calls page revalidation", () => {
  it("answers a filter, a search or a page change without the server", () => {
    // arrange
    const paged = {
      currentUrl: new URL(`${CALLS_URL}?status=past`),
      defaultShouldRevalidate: true,
      nextUrl: new URL(`${CALLS_URL}?status=past&page=2`),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(paged);

    // assert
    expect(revalidates).toBe(false);
  });

  it("re-reads the calls on an ordinary navigation", () => {
    // arrange
    const arrival = {
      currentUrl: new URL("http://localhost/coach/"),
      defaultShouldRevalidate: true,
      nextUrl: new URL(CALLS_URL),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(arrival);

    // assert
    expect(revalidates).toBe(true);
  });
});

function createLoaderArguments(loadCalls: ReturnType<typeof vi.fn>) {
  const feature = {
    coachAssessmentCalls: { loadCalls },
  } as unknown as AssessmentCallsFeature;

  return createRequestArgs({
    contexts: [contextEntry(assessmentCallsContext, feature)],
    request: new Request(CALLS_URL),
  });
}
