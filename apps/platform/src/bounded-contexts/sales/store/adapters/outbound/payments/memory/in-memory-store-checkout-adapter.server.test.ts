import { describe, expect, it } from "vitest";

import { InMemoryStoreCheckoutAdapter } from "./in-memory-store-checkout-adapter.server";

const command = {
  orderId: "0b6c2f0e-5a4d-4e7b-9d61-3a2b1c0d9e8f",
  email: "woman@example.com",
  currency: "EUR" as const,
  lines: [{ title: "30-Day Fat Loss Plan", amountMinorUnits: 3900 }],
  successUrl:
    "http://localhost:3000/store/checkout/complete?session_id={CHECKOUT_SESSION_ID}",
  cancelUrl: "http://localhost:3000/store?payment=cancelled",
};

describe("InMemoryStoreCheckoutAdapter", () => {
  it("leads straight to the order-complete page of the session it opened", async () => {
    // arrange
    const adapter = new InMemoryStoreCheckoutAdapter();

    // act
    const opened = await adapter.open(command);

    // assert
    expect(opened.sessionId).toMatch(/^cs_memory_/);
    expect(opened.url).toBe(
      `http://localhost:3000/store/checkout/complete?session_id=${opened.sessionId}`,
    );
  });

  it("reports a session it opened as paid and any other as not paid", async () => {
    // arrange
    const adapter = new InMemoryStoreCheckoutAdapter();
    const opened = await adapter.open(command);

    // act
    const answers = await Promise.all([
      adapter.isPaid(opened.sessionId),
      adapter.isPaid("cs_memory_unknown"),
    ]);

    // assert
    expect(answers).toEqual([true, false]);
  });
});
