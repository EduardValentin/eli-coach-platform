import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { AssessmentCallsFeature } from "~/features/assessment-calls/server/assessment-calls-composition.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, shouldRevalidate } from "./book-page";

const botDetection = { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" };

describe("assessment call booking page loader", () => {
  it("hides the page while the site is in waitlist mode", async () => {
    // arrange
    const loadBookingPage = vi
      .fn()
      .mockRejectedValue(new Response("Not Found", { status: 404 }));

    // act
    const loading = loader(createLoaderArguments(loadBookingPage));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("carries the open slots into the server-rendered page", async () => {
    // arrange
    const page = {
      botDetection,
      coachTimeZone: "Europe/Bucharest",
      slots: ["2026-10-19T14:00:00.000Z"],
      status: "open",
    };

    // act
    const loaded = loader(
      createLoaderArguments(vi.fn().mockResolvedValue(page)),
    );

    // assert
    await expect(loaded).resolves.toEqual(page);
  });

  it("carries unreadable availability into the server-rendered page", async () => {
    // arrange
    const page = { botDetection, status: "unavailable" };

    // act
    const loaded = loader(
      createLoaderArguments(vi.fn().mockResolvedValue(page)),
    );

    // assert
    await expect(loaded).resolves.toEqual(page);
  });
});

describe("assessment call booking page revalidation", () => {
  it("does not re-read the open slots when a booking is submitted", () => {
    // arrange
    const submission = {
      defaultShouldRevalidate: true,
      formMethod: "POST",
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(submission);

    // assert
    expect(revalidates).toBe(false);
  });

  it("re-reads the open slots on an ordinary navigation", () => {
    // arrange
    const navigation = {
      defaultShouldRevalidate: true,
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(navigation);

    // assert
    expect(revalidates).toBe(true);
  });
});

function createLoaderArguments(loadBookingPage: ReturnType<typeof vi.fn>) {
  const feature = {
    assessmentCalls: { loadBookingPage },
  } as unknown as AssessmentCallsFeature;

  return createRequestArgs({
    contexts: [contextEntry(assessmentCallsContext, feature)],
    request: new Request("http://localhost/book"),
  });
}
