import { describe, expect, it } from "vitest";

import type { WaitlistJoinResponse } from "~/features/waitlist/contracts/waitlist";

import { resolveSubmissionState } from "./submission-flow";

describe("resolveSubmissionState", () => {
  it("celebrates a successful join", () => {
    // arrange
    const response: WaitlistJoinResponse = { success: true };

    // act
    const state = resolveSubmissionState({
      isAwaitingChallenge: false,
      isSubmitting: false,
      response,
    });

    // assert
    expect(state.shouldCelebrate).toBe(true);
    expect(state.isSubmitted).toBe(true);
    expect(state.shouldResetChallenge).toBe(false);
  });

  it("resets the challenge and surfaces the error once a failed response has settled", () => {
    // arrange
    const response: WaitlistJoinResponse = {
      success: false,
      error: { code: "server_error", message: "Unable to process waitlist signup." },
    };

    // act
    const state = resolveSubmissionState({
      isAwaitingChallenge: false,
      isSubmitting: false,
      response,
    });

    // assert
    expect(state.shouldResetChallenge).toBe(true);
    expect(state.error).toEqual(response.error);
    expect(state.shouldCelebrate).toBe(false);
  });
});
