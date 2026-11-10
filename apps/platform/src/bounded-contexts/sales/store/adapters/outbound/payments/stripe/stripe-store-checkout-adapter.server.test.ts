import type { OpenCheckoutCommand } from "~/bounded-contexts/sales/store/domain/order";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { StripeStoreCheckoutAdapter } from "./stripe-store-checkout-adapter.server";

const ORDER_ID = "0b6c2f0e-5a4d-4e7b-9d61-3a2b1c0d9e8f";

const command: OpenCheckoutCommand = {
  orderId: ORDER_ID,
  email: "woman@example.com",
  currency: "USD",
  lines: [
    { title: "30-Day Fat Loss Plan", amountMinorUnits: 4500 },
    { title: "Nutritional Reset Plan", amountMinorUnits: 3300 },
  ],
  successUrl:
    "https://evoa.fit/store/checkout/complete?session_id={CHECKOUT_SESSION_ID}",
  cancelUrl: "https://evoa.fit/store?payment=cancelled",
};

function createClient(retrieved: unknown = null) {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_order",
          url: "https://checkout.stripe.com/c/pay/cs_test_order",
        }),
        retrieve: vi.fn().mockResolvedValue(retrieved),
      },
    },
  };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_order",
    status: "complete",
    payment_status: "paid",
    metadata: { purpose: "store-order", orderId: ORDER_ID },
    ...overrides,
  };
}

describe("StripeStoreCheckoutAdapter", () => {
  it("opens a one-time payment page with her email locked and the paid lines in her currency", async () => {
    // arrange
    const client = createClient();
    const adapter = new StripeStoreCheckoutAdapter(client);

    // act
    const opened = await adapter.open(command);

    // assert
    expect(opened).toEqual({
      sessionId: "cs_test_order",
      url: "https://checkout.stripe.com/c/pay/cs_test_order",
    });
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(
      {
        mode: "payment",
        customer_email: "woman@example.com",
        payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: 4500,
              product_data: { name: "30-Day Fat Loss Plan" },
            },
          },
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: 3300,
              product_data: { name: "Nutritional Reset Plan" },
            },
          },
        ],
        metadata: { purpose: "store-order", orderId: ORDER_ID },
        payment_intent_data: {
          metadata: { purpose: "store-order", orderId: ORDER_ID },
        },
        success_url: command.successUrl,
        cancel_url: command.cancelUrl,
      },
      { idempotencyKey: `store-order:${ORDER_ID}:checkout` },
    );
  });

  it("refuses a session Stripe opened without a hosted page", async () => {
    // arrange
    const client = createClient();
    client.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_order",
      url: null,
    });
    const adapter = new StripeStoreCheckoutAdapter(client);

    // act
    const opening = adapter.open(command);

    // assert
    await expect(opening).rejects.toThrow(/no hosted page/);
  });

  it("reports a completed and paid store session as paid", async () => {
    // arrange
    const client = createClient(session());
    const adapter = new StripeStoreCheckoutAdapter(client);

    // act
    const paid = await adapter.isPaid("cs_test_order");

    // assert
    expect(paid).toBe(true);
    expect(client.checkout.sessions.retrieve).toHaveBeenCalledWith(
      "cs_test_order",
    );
  });

  it("reports an open, unpaid or foreign session as not paid", async () => {
    // arrange
    const sessions = [
      session({ status: "open", payment_status: "unpaid" }),
      session({ payment_status: "unpaid" }),
      session({ metadata: { purpose: "coaching-subscription" } }),
    ];

    // act
    const answers = await Promise.all(
      sessions.map((retrieved) =>
        new StripeStoreCheckoutAdapter(createClient(retrieved)).isPaid(
          "cs_test_order",
        ),
      ),
    );

    // assert
    expect(answers).toEqual([false, false, false]);
  });

  it("answers not paid for a malformed session id without asking Stripe", async () => {
    // arrange
    const client = createClient(session());
    const adapter = new StripeStoreCheckoutAdapter(client);

    // act
    const paid = await adapter.isPaid("not-a-session");

    // assert
    expect(paid).toBe(false);
    expect(client.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it("answers not paid for a session Stripe does not know", async () => {
    // arrange
    const client = createClient();
    client.checkout.sessions.retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        code: "resource_missing",
        message: "No such checkout.session",
        type: "invalid_request_error",
      }),
    );
    const adapter = new StripeStoreCheckoutAdapter(client);

    // act
    const paid = await adapter.isPaid("cs_test_unknown");

    // assert
    expect(paid).toBe(false);
  });

  it("rethrows any other Stripe failure", async () => {
    // arrange
    const client = createClient();
    client.checkout.sessions.retrieve.mockRejectedValue(
      new Error("Stripe unreachable"),
    );
    const adapter = new StripeStoreCheckoutAdapter(client);

    // act
    const reading = adapter.isPaid("cs_test_order");

    // assert
    await expect(reading).rejects.toThrow("Stripe unreachable");
  });
});
