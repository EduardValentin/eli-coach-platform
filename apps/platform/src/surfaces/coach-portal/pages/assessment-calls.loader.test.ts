import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import type { AssessmentCallsFeature } from "~/features/assessment-calls/server/assessment-calls-composition.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, shouldRevalidate } from "./assessment-calls";

const NOW = "2026-09-20T09:00:00.000Z";

function callEndingAt(id: string, endsAt: string): CoachAssessmentCall {
  const ends = new Date(endsAt);

  return {
    bookedAt: "2026-09-10T09:00:00.000Z",
    country: "RO",
    dateOfBirth: "1994-03-14",
    endsAt: ends.toISOString(),
    firstName: "Ana",
    fullName: "Ana Popescu",
    gender: "female",
    id,
    joinPath: `/book/${id}/join`,
    lastName: "Popescu",
    phone: null,
    primaryGoal: "build_strength",
    startsAt: new Date(ends.getTime() - 30 * 60_000).toISOString(),
    visitorEmail: "ana@example.com",
    visitorNotes: null,
  };
}

const ENDED = callEndingAt("ended", "2026-09-19T15:30:00.000Z");
const ENDING_NOW = callEndingAt("ending-now", NOW);
const UPCOMING = callEndingAt("upcoming", "2026-09-20T15:30:00.000Z");

const LISTING = {
  calls: [ENDED, ENDING_NOW, UPCOMING],
  coachTimeZone: "Europe/Bucharest",
  now: NOW,
};

const CALLS_URL = "http://localhost/coach/assessment-calls";

describe("coach assessment calls page loader", () => {
  it("carries every booked call and the sales state of each ended one into the server-rendered page", async () => {
    // arrange
    const loadSalesStates = vi
      .fn()
      .mockResolvedValue({ ended: "paid", "ending-now": "held" });

    // act
    const loaded = await loader(
      createLoaderArguments({
        loadCalls: vi.fn().mockResolvedValue(LISTING),
        loadSalesStates,
      }),
    );

    // assert
    expect(loaded).toEqual({
      ...LISTING,
      salesStates: { ended: "paid", "ending-now": "held" },
    });
    expect(loadSalesStates).toHaveBeenCalledWith(["ended", "ending-now"]);
  });

  it("leaves the denial the portal middleware raises alone", async () => {
    // arrange
    const loadCalls = vi
      .fn()
      .mockRejectedValue(new Response("Forbidden", { status: 403 }));

    // act
    const loading = loader(createLoaderArguments({ loadCalls }));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 403 });
  });

  it("leaves the 503 the controller raises when the calls cannot be read alone", async () => {
    // arrange
    const loadCalls = vi
      .fn()
      .mockRejectedValue(new Response("unavailable", { status: 503 }));

    // act
    const loading = loader(createLoaderArguments({ loadCalls }));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 503 });
  });
});

describe("coach assessment calls page revalidation", () => {
  it("answers a window, a status, a search or a page change without the server", () => {
    // arrange
    const changes = [
      [`${CALLS_URL}?when=past`, `${CALLS_URL}?when=past&page=2`],
      [CALLS_URL, `${CALLS_URL}?status=paid`],
      [`${CALLS_URL}?status=held`, `${CALLS_URL}?status=held&q=ana`],
    ];

    // act
    const revalidations = changes.map(([current, next]) =>
      shouldRevalidate({
        currentUrl: new URL(current),
        defaultShouldRevalidate: true,
        nextUrl: new URL(next),
      } as ShouldRevalidateFunctionArgs),
    );

    // assert
    expect(revalidations).toEqual([false, false, false]);
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

  it("re-reads the calls and their sales states after a payment link is sent", () => {
    // arrange
    const afterSend = {
      currentUrl: new URL(`${CALLS_URL}?status=held`),
      defaultShouldRevalidate: true,
      nextUrl: new URL(`${CALLS_URL}?status=held`),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(afterSend);

    // assert
    expect(revalidates).toBe(true);
  });
});

function createLoaderArguments(readers: {
  loadCalls: ReturnType<typeof vi.fn>;
  loadSalesStates?: ReturnType<typeof vi.fn>;
}) {
  const assessmentCalls = {
    coachAssessmentCalls: { loadCalls: readers.loadCalls },
  } as unknown as AssessmentCallsFeature;
  const coachingSales = {
    coachSales: { loadSalesStates: readers.loadSalesStates ?? vi.fn() },
  } as unknown as CoachingSalesFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(assessmentCallsContext, assessmentCalls),
      contextEntry(coachingSalesContext, coachingSales),
    ],
    request: new Request(CALLS_URL),
  });
}
