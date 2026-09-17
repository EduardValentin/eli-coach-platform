import { describe, expect, it } from "vitest";

import { TURNSTILE_RESPONSE_FIELD } from "../bot-detection-contract";
import {
  reduceBotDetectionFlow,
  type BotDetectionFlowState,
} from "./bot-detection-flow";

const idleState: BotDetectionFlowState = {
  awaitingChallenge: false,
  pendingFormData: null,
  token: "",
};

describe("reduceBotDetectionFlow", () => {
  it("delivers immediately when a token is already held", () => {
    // arrange
    const state: BotDetectionFlowState = { ...idleState, token: "held-token" };
    const formData = new FormData();
    formData.set("email", "woman@example.com");

    // act
    const result = reduceBotDetectionFlow(state, { type: "submit", formData });

    // assert
    expect(result.deliver?.get(TURNSTILE_RESPONSE_FIELD)).toBe("held-token");
    expect(result.state).toEqual(idleState);
  });

  it("awaits the challenge when no token is held yet", () => {
    // arrange
    const formData = new FormData();

    // act
    const result = reduceBotDetectionFlow(idleState, {
      type: "submit",
      formData,
    });

    // assert
    expect(result.deliver).toBeNull();
    expect(result.state).toEqual({
      awaitingChallenge: true,
      pendingFormData: formData,
      token: "",
    });
  });

  it("delivers the pending submission once the token arrives", () => {
    // arrange
    const formData = new FormData();
    const state: BotDetectionFlowState = {
      awaitingChallenge: true,
      pendingFormData: formData,
      token: "",
    };

    // act
    const result = reduceBotDetectionFlow(state, {
      type: "token",
      token: "fresh-token",
    });

    // assert
    expect(result.deliver?.get(TURNSTILE_RESPONSE_FIELD)).toBe("fresh-token");
    expect(result.state).toEqual(idleState);
  });

  it("surfaces an error and drops the pending submission on a challenge error", () => {
    // arrange
    const formData = new FormData();
    const state: BotDetectionFlowState = {
      awaitingChallenge: true,
      pendingFormData: formData,
      token: "",
    };

    // act
    const result = reduceBotDetectionFlow(state, { type: "challenge-error" });

    // assert
    expect(result.error).toBe(
      "We couldn't verify this request. Please try again.",
    );
    expect(result.state.pendingFormData).toBeNull();
  });
});
