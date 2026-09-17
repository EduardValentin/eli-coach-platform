import { describe, expect, it } from "vitest";

import type { StoreAcquisitionResponse } from "~/features/store/contracts/store";

import { reduceAcquisitionFlow } from "./acquisition-flow";

const createIdempotencyKey = () => "new-key";

describe("reduceAcquisitionFlow", () => {
  it("clears the cart, resets the form and challenge, and issues a new key on success", () => {
    // arrange
    const state = { idempotencyKey: "current-key", step: "details" as const };
    const response: StoreAcquisitionResponse = { success: true };

    // act
    const result = reduceAcquisitionFlow(
      state,
      { type: "response", response },
      createIdempotencyKey,
    );

    // assert
    expect(result.state).toEqual({
      idempotencyKey: "new-key",
      step: "success",
    });
    expect(result.effects).toEqual([
      { type: "clear-cart" },
      { type: "reset-form" },
      { type: "reset-challenge" },
    ]);
  });

  it("reconciles the cart and returns to it with a new key when products became unavailable", () => {
    // arrange
    const state = { idempotencyKey: "current-key", step: "details" as const };
    const response: StoreAcquisitionResponse = {
      success: false,
      error: {
        code: "unavailable_products",
        message: "Some resources are no longer available.",
        availableProductSlugs: ["remaining-guide"],
      },
    };

    // act
    const result = reduceAcquisitionFlow(
      state,
      { type: "response", response },
      createIdempotencyKey,
    );

    // assert
    expect(result.state).toEqual({ idempotencyKey: "new-key", step: "cart" });
    expect(result.effects).toEqual([
      {
        type: "reconcile-products",
        availableProductSlugs: ["remaining-guide"],
      },
      { type: "reset-challenge" },
    ]);
  });

  it("keeps the idempotency key and only resets the challenge after a server error", () => {
    // arrange
    const state = { idempotencyKey: "current-key", step: "details" as const };
    const response: StoreAcquisitionResponse = {
      success: false,
      error: { code: "server_error", message: "Something went wrong." },
    };

    // act
    const result = reduceAcquisitionFlow(
      state,
      { type: "response", response },
      createIdempotencyKey,
    );

    // assert
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([{ type: "reset-challenge" }]);
  });
});
