import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { CheckInsFeature } from "~/features/check-ins/server/check-ins-composition.server";
import { checkInsContext } from "~/features/check-ins/server/guards/check-ins-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, shouldRevalidate } from "./layout";

describe("coach shell loader", () => {
  it("counts the check-ins waiting for the coach's answer", async () => {
    // arrange
    const loadAwaitingCount = vi.fn().mockResolvedValue(4);
    const args = createRequestArgs({
      contexts: [
        contextEntry(checkInsContext, {
          coachCheckIns: { loadAwaitingCount },
        } as unknown as CheckInsFeature),
      ],
      request: new Request("https://evoa.fit/coach"),
    });

    // act
    const shell = await loader(args);

    // assert
    expect(shell).toEqual({ checkInsAwaiting: 4 });
    expect(loadAwaitingCount).toHaveBeenCalledWith(args);
  });
});

describe("coach shell revalidation", () => {
  it("re-reads the count when she moves to another coach page", () => {
    // arrange
    const navigation = {
      currentUrl: new URL("https://evoa.fit/coach"),
      defaultShouldRevalidate: false,
      nextUrl: new URL("https://evoa.fit/coach/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(navigation);

    // assert
    expect(revalidates).toBe(true);
  });

  it("keeps the count when a submission on the same page opts out of revalidation", () => {
    // arrange
    const submission = {
      currentUrl: new URL("https://evoa.fit/coach/checkins"),
      defaultShouldRevalidate: false,
      formMethod: "POST",
      nextUrl: new URL("https://evoa.fit/coach/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(submission);

    // assert
    expect(revalidates).toBe(false);
  });

  it("re-reads the count after a submission that revalidates as usual", () => {
    // arrange
    const submission = {
      currentUrl: new URL("https://evoa.fit/coach/checkins"),
      defaultShouldRevalidate: true,
      formMethod: "POST",
      nextUrl: new URL("https://evoa.fit/coach/checkins"),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(submission);

    // assert
    expect(revalidates).toBe(true);
  });
});
