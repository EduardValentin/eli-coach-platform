import type { PaymentCustomerCardsPort } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import { describe, expect, it } from "vitest";

import { InMemoryPaymentCustomerCardsAdapter } from "./in-memory-payment-customer-cards-adapter.server";

describe("InMemoryPaymentCustomerCards", () => {
  it("reads the fixed test card for any customer", async () => {
    // arrange
    const paymentCustomerCardsPort: PaymentCustomerCardsPort =
      new InMemoryPaymentCustomerCardsAdapter();

    // act
    const card = await paymentCustomerCardsPort.readDefaultCard("cus_memory_1");

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
