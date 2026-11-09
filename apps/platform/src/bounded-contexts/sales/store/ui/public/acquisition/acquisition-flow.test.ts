import { EMAIL_SUBADDRESS_REFUSED_MESSAGE } from "~/shared/submission-checks/email-address-copy";
import { describe, expect, it } from "vitest";

import type { StoreAcquisitionResponse } from "~/bounded-contexts/sales/store/public/store";
import type { StoreCheckoutResponse } from "~/bounded-contexts/sales/store/public/store-orders";

import {
  reduceAcquisitionFlow,
  resolveAcquisitionError,
  resolveCheckoutError,
} from "./acquisition-flow";

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

  it("keeps the details step and puts a refused subaddress on the email field", () => {
    // arrange
    const state = { idempotencyKey: "current-key", step: "details" as const };
    const response: StoreAcquisitionResponse = {
      success: false,
      error: {
        code: "email_subaddress_refused",
        message: "Unable to deliver store resources.",
      },
    };

    // act
    const result = reduceAcquisitionFlow(
      state,
      { type: "response", response },
      createIdempotencyKey,
    );

    // assert
    expect(result.state).toEqual({
      idempotencyKey: "new-key",
      step: "details",
    });
    expect(result.effects).toEqual([
      { type: "show-email-error", message: EMAIL_SUBADDRESS_REFUSED_MESSAGE },
      { type: "reset-challenge" },
    ]);
    expect(resolveAcquisitionError(response)).toBeNull();
  });
});

describe("reduceAcquisitionFlow for a paid checkout", () => {
  it("opens the hosted payment page and issues a new key for any later attempt", () => {
    // arrange
    const state = { idempotencyKey: "current-key", step: "details" as const };
    const response: StoreCheckoutResponse = {
      success: true,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_order",
    };

    // act
    const result = reduceAcquisitionFlow(
      state,
      { type: "checkout-response", response },
      createIdempotencyKey,
    );

    // assert
    expect(result.state).toEqual({
      idempotencyKey: "new-key",
      step: "details",
    });
    expect(result.effects).toEqual([
      {
        type: "open-checkout",
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_order",
      },
      { type: "reset-challenge" },
    ]);
  });

  it("keeps the key so a retry replays the same order when checkout is unavailable", () => {
    // arrange
    const state = { idempotencyKey: "current-key", step: "details" as const };
    const response: StoreCheckoutResponse = {
      success: false,
      error: { code: "checkout_unavailable", message: "Unavailable." },
    };

    // act
    const result = reduceAcquisitionFlow(
      state,
      { type: "checkout-response", response },
      createIdempotencyKey,
    );

    // assert
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([{ type: "reset-challenge" }]);
  });

  it("returns to the unchanged cart with a new key when products were withdrawn", () => {
    // arrange
    const state = { idempotencyKey: "current-key", step: "details" as const };
    const response: StoreCheckoutResponse = {
      success: false,
      error: {
        code: "unavailable_products",
        message: "Unavailable.",
        availableProductSlugs: [],
      },
    };

    // act
    const result = reduceAcquisitionFlow(
      state,
      { type: "checkout-response", response },
      createIdempotencyKey,
    );

    // assert
    expect(result.state).toEqual({ idempotencyKey: "new-key", step: "cart" });
    expect(result.effects).toEqual([{ type: "reset-challenge" }]);
    expect(resolveCheckoutError(response, [])).toBe(
      "The items in your cart are no longer available. Remove them to continue.",
    );
  });
});
