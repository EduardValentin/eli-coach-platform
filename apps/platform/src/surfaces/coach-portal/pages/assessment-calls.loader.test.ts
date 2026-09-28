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
  it("carries every booked call with its sales state and its price tier into the server-rendered page", async () => {
    // arrange
    const callSales = {
      ended: {
        state: "paid",
        clientId: "2d3e4f50-6172-4839-9a0b-1c2d3e4f5061",
      },
      "ending-now": { state: "held", clientId: null },
      upcoming: { state: "held", clientId: null },
    };
    const loadCallSales = vi.fn().mockResolvedValue(callSales);
    const pricingTiers = {
      ended: "reduced",
      "ending-now": "regular",
      upcoming: "regular",
    };
    const loadPricingTiers = vi.fn().mockResolvedValue(pricingTiers);

    // act
    const loaded = await loader(
      createLoaderArguments({
        loadCalls: vi.fn().mockResolvedValue(LISTING),
        loadPricingTiers,
        loadCallSales,
      }),
    );

    // assert
    expect(loaded).toEqual({
      ...LISTING,
      pricingTiers,
      callSales,
    });
    expect(loadCallSales).toHaveBeenCalledWith([
      "ended",
      "ending-now",
      "upcoming",
    ]);
    expect(loadPricingTiers).toHaveBeenCalledWith([
      { email: "ana@example.com", id: "ended" },
      { email: "ana@example.com", id: "ending-now" },
      { email: "ana@example.com", id: "upcoming" },
    ]);
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
  loadPricingTiers?: ReturnType<typeof vi.fn>;
  loadCallSales?: ReturnType<typeof vi.fn>;
}) {
  const assessmentCalls = {
    coachAssessmentCalls: { loadCalls: readers.loadCalls },
  } as unknown as AssessmentCallsFeature;
  const coachingSales = {
    coachSales: {
      loadPricingTiers: readers.loadPricingTiers ?? vi.fn(),
      loadCallSales: readers.loadCallSales ?? vi.fn(),
    },
  } as unknown as CoachingSalesFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(assessmentCallsContext, assessmentCalls),
      contextEntry(coachingSalesContext, coachingSales),
    ],
    request: new Request(CALLS_URL),
  });
}
