import type { PaymentCustomerCards } from "@eli-coach-platform/domain/coaching-subscription";
import { describe, expect, it } from "vitest";

import { InMemoryPaymentCustomerCards } from "./in-memory-payment-customer-cards.server";

describe("InMemoryPaymentCustomerCards", () => {
  it("reads the fixed test card for any customer", async () => {
    // arrange
    const cards: PaymentCustomerCards = new InMemoryPaymentCustomerCards();

    // act
    const card = await cards.readDefaultCard("cus_memory_1");

    // assert
    expect(card?.toSnapshot()).toEqual({
      brand: "visa",
      lastFour: "4242",
      expiryMonth: 12,
      expiryYear: 2034,
      paymentMethodId: "pm_memory_card",
    });
  });
});
