import { describe, expect, it } from "vitest";

import {
  storeCheckoutRequestSchema,
  storeCheckoutResponseSchema,
  storeCheckoutSessionIdSchema,
  storeOrderConfirmationSchema,
  storeOrderEmailResendRequestSchema,
  storeOrderEmailResendResponseSchema,
} from "./store-orders";

const submission = {
  "cf-turnstile-response": "turnstile-token",
  idempotencyKey: "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a",
  email: " Woman@Example.com ",
  productSlugs: JSON.stringify(["fat-loss-30", "hormone-harmony"]),
  currency: "USD",
  termsAccepted: "true",
  deliveryConsent: "true",
  marketingConsent: "false",
};

describe("Store order contracts", () => {
  it("reads a paid checkout submission from its form fields", () => {
    // arrange
    const fields = submission;

    // act
    const parsed = storeCheckoutRequestSchema.parse(fields);

    // assert
    expect(parsed).toEqual({
      "cf-turnstile-response": "turnstile-token",
      idempotencyKey: "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a",
      email: "Woman@Example.com",
      productSlugs: ["fat-loss-30", "hormone-harmony"],
      currency: "USD",
      termsAccepted: true,
      deliveryConsent: true,
      marketingConsent: false,
    });
  });

  it("refuses a submission without the Terms, without the delivery consent or with an unknown field", () => {
    // arrange
    const refused = [
      { ...submission, termsAccepted: "false" },
      { ...submission, deliveryConsent: "false" },
      { ...submission, currency: "GBP" },
      { ...submission, price: "1" },
    ];

    // act
    const results = refused.map(
      (fields) => storeCheckoutRequestSchema.safeParse(fields).success,
    );

    // assert
    expect(results).toEqual([false, false, false, false]);
  });

  it("answers a checkout with the hosted page or a refusal naming the available products", () => {
    // arrange
    const responses = [
      { success: true, checkoutUrl: "https://checkout.stripe.com/c/pay/cs" },
      {
        success: false,
        error: {
          code: "unavailable_products",
          message: "Unable to start the checkout.",
          availableProductSlugs: ["fat-loss-30"],
        },
      },
      {
        success: false,
        error: {
          code: "checkout_unavailable",
          message: "Unable to start the checkout.",
        },
      },
    ];

    // act
    const parsed = responses.map((response) =>
      storeCheckoutResponseSchema.parse(response),
    );

    // assert
    expect(parsed).toEqual(responses);
  });

  it("accepts Stripe and local session ids and refuses anything else", () => {
    // arrange
    const ids = [
      "cs_test_a1B2c3",
      "cs_memory_0b6c2f0e-5a4d-4e7b-9d61-3a2b1c0d9e8f",
      "pi_123",
      "cs_test_<script>",
    ];

    // act
    const results = ids.map(
      (id) => storeCheckoutSessionIdSchema.safeParse(id).success,
    );

    // assert
    expect(results).toEqual([true, true, false, false]);
  });

  it("describes a confirmed order with free lines without an amount", () => {
    // arrange
    const confirmation = {
      status: "confirmed",
      sessionId: "cs_test_a1B2c3",
      email: "woman@example.com",
      currency: "EUR",
      lines: [
        { title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 },
        { title: "Hormone Harmony E-Book", amountMinorUnits: null },
      ],
      totalMinorUnits: 3900,
      termsVersion: "1.0",
    };

    // act
    const parsed = storeOrderConfirmationSchema.parse(confirmation);

    // assert
    expect(parsed).toEqual(confirmation);
  });

  it("reads a resend request by session and answers its outcome", () => {
    // arrange
    const request = { sessionId: "cs_test_a1B2c3" };
    const response = { success: true, outcome: "rate_limited" };

    // act
    const parsedRequest = storeOrderEmailResendRequestSchema.parse(request);
    const parsedResponse = storeOrderEmailResendResponseSchema.parse(response);

    // assert
    expect(parsedRequest).toEqual(request);
    expect(parsedResponse).toEqual(response);
    expect(
      storeOrderEmailResendRequestSchema.safeParse({ ...request, extra: "1" })
        .success,
    ).toBe(false);
  });
});
