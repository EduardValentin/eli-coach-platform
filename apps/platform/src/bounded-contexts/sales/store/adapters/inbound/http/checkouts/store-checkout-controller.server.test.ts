import { describe, expect, it, vi } from "vitest";

import type {
  PlaceOrderResult,
  PlaceOrderUseCase,
} from "~/bounded-contexts/sales/store/domain/order";
import {
  STORE_ACQUISITION_TURNSTILE_ACTION,
  TURNSTILE_RESPONSE_FIELD,
} from "~/shared/submission-checks/bot-detection";

import { StoreCheckoutController } from "./store-checkout-controller.server";

const IDEMPOTENCY_KEY = "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a";

function createRequest(
  fields: Record<string, string> = {},
  omitted: readonly string[] = [],
): Request {
  const formData = new FormData();
  const entries = {
    [TURNSTILE_RESPONSE_FIELD]: "verified-token",
    idempotencyKey: IDEMPOTENCY_KEY,
    email: "Woman@Example.com",
    productSlugs: JSON.stringify(["fat-loss-30", "hormone-harmony"]),
    currency: "EUR",
    termsAccepted: "true",
    deliveryConsent: "true",
    marketingConsent: "true",
    ...fields,
  };

  for (const [name, value] of Object.entries(entries)) {
    if (!omitted.includes(name)) {
      formData.set(name, value);
    }
  }

  return new Request("https://eli.example/api/store/checkouts", {
    body: formData,
    headers: { "CF-Connecting-IP": "203.0.113.9" },
    method: "POST",
  });
}

function createController(options: {
  result?: PlaceOrderResult | Error;
  verification?: "verified" | "rejected" | "unavailable";
}) {
  const execute = vi.fn(async () => {
    if (options.result instanceof Error) {
      throw options.result;
    }

    return (
      options.result ?? {
        status: "opened",
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_order",
      }
    );
  });
  const botVerifierPort = {
    verifySubmission: vi
      .fn()
      .mockResolvedValue({ status: options.verification ?? "verified" }),
  };
  const storeCheckoutController = new StoreCheckoutController({
    appBasePath: "/eli",
    botVerifierPort,
    placeOrderUseCase: { execute } as unknown as PlaceOrderUseCase,
    publicAppUrl: "https://eli.example",
  });

  return { botVerifierPort, execute, storeCheckoutController };
}

describe("StoreCheckoutController", () => {
  it("verifies Turnstile, places the order with absolute return addresses and answers the hosted page", async () => {
    // arrange
    const { botVerifierPort, execute, storeCheckoutController } =
      createController({});

    // act
    const response = await storeCheckoutController.placeOrder(createRequest());

    // assert
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_order",
    });
    expect(botVerifierPort.verifySubmission).toHaveBeenCalledWith({
      action: STORE_ACQUISITION_TURNSTILE_ACTION,
      remoteIp: "203.0.113.9",
      token: "verified-token",
    });
    expect(execute).toHaveBeenCalledWith({
      email: "Woman@Example.com",
      idempotencyKey: IDEMPOTENCY_KEY,
      productSlugs: ["fat-loss-30", "hormone-harmony"],
      currency: "EUR",
      marketingConsent: true,
      successUrl:
        "https://eli.example/eli/store/checkout/complete?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://eli.example/eli/store?payment=cancelled",
    });
  });

  it("answers a replay after payment with the order-complete page", async () => {
    // arrange
    const { storeCheckoutController } = createController({
      result: { status: "paid", checkoutSessionId: "cs_test_order" },
    });

    // act
    const response = await storeCheckoutController.placeOrder(createRequest());

    // assert
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      checkoutUrl:
        "https://eli.example/eli/store/checkout/complete?session_id=cs_test_order",
    });
  });

  it("refuses a submission without the immediate-delivery consent before verifying it", async () => {
    // arrange
    const { botVerifierPort, execute, storeCheckoutController } =
      createController({});

    // act
    const response = await storeCheckoutController.placeOrder(
      createRequest({}, ["deliveryConsent"]),
    );

    // assert
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_request" },
    });
    expect(botVerifierPort.verifySubmission).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("never places an order Turnstile rejects or cannot verify", async () => {
    // arrange
    const rejected = createController({ verification: "rejected" });
    const unavailable = createController({ verification: "unavailable" });

    // act
    const responses = await Promise.all([
      rejected.storeCheckoutController.placeOrder(createRequest()),
      unavailable.storeCheckoutController.placeOrder(createRequest()),
    ]);

    // assert
    expect(responses.map((response) => response.status)).toEqual([400, 503]);
    await expect(responses[0]!.json()).resolves.toMatchObject({
      error: { code: "bot_verification_failed" },
    });
    await expect(responses[1]!.json()).resolves.toMatchObject({
      error: { code: "checkout_unavailable" },
    });
    expect(rejected.execute).not.toHaveBeenCalled();
    expect(unavailable.execute).not.toHaveBeenCalled();
  });

  it("maps each refusal to its code and status", async () => {
    // arrange
    const results: PlaceOrderResult[] = [
      { status: "subaddress_refused" },
      {
        status: "unavailable_products",
        availableProductSlugs: ["fat-loss-30"],
      },
      { status: "no_paid_items" },
      { status: "idempotency_conflict" },
      { status: "checkout_unavailable" },
    ];

    // act
    const responses = await Promise.all(
      results.map((result) =>
        createController({ result }).storeCheckoutController.placeOrder(
          createRequest(),
        ),
      ),
    );

    // assert
    const answers = await Promise.all(
      responses.map(async (response) => ({
        status: response.status,
        body: await response.json(),
      })),
    );
    expect(answers).toEqual([
      {
        status: 422,
        body: {
          success: false,
          error: {
            code: "subaddress_refused",
            message: "Unable to start the checkout.",
          },
        },
      },
      {
        status: 409,
        body: {
          success: false,
          error: {
            code: "unavailable_products",
            message: "Unable to start the checkout.",
            availableProductSlugs: ["fat-loss-30"],
          },
        },
      },
      {
        status: 409,
        body: {
          success: false,
          error: {
            code: "no_paid_items",
            message: "Unable to start the checkout.",
          },
        },
      },
      {
        status: 409,
        body: {
          success: false,
          error: {
            code: "idempotency_conflict",
            message: "Unable to start the checkout.",
          },
        },
      },
      {
        status: 503,
        body: {
          success: false,
          error: {
            code: "checkout_unavailable",
            message: "Unable to start the checkout.",
          },
        },
      },
    ]);
  });

  it("answers temporary unavailability when placing fails unexpectedly, without logging her address", async () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { storeCheckoutController } = createController({
      result: new Error("database down"),
    });

    // act
    const response = await storeCheckoutController.placeOrder(createRequest());

    // assert
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "checkout_unavailable" },
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "Example.com",
    );
    consoleError.mockRestore();
  });
});
