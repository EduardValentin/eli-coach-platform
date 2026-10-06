import { PaymentCard } from "@eli-coach-platform/domain/coaching-subscription";
import { describe, expect, it, vi } from "vitest";

import { StripePaymentCustomerCards } from "./stripe-payment-customer-cards.server";

const VISA_PAYMENT_METHOD = {
  id: "pm_visa",
  object: "payment_method",
  type: "card",
  customer: "cus_1",
  card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2034 },
};

const VISA = PaymentCard.of({
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
  paymentMethodId: "pm_visa",
});

function customer(overrides: Record<string, unknown> = {}) {
  return {
    id: "cus_1",
    object: "customer",
    invoice_settings: { default_payment_method: null },
    subscriptions: { object: "list", data: [] },
    ...overrides,
  };
}

function createStubClient(options: {
  customer: unknown;
  paymentMethod?: unknown;
}) {
  return {
    customers: { retrieve: vi.fn().mockResolvedValue(options.customer) },
    paymentMethods: {
      retrieve: vi
        .fn()
        .mockResolvedValue(options.paymentMethod ?? VISA_PAYMENT_METHOD),
    },
  };
}

describe("StripePaymentCustomerCards", () => {
  it("reads the customer's default payment method with its subscriptions expanded", async () => {
    // arrange
    const client = createStubClient({
      customer: customer({
        invoice_settings: { default_payment_method: "pm_visa" },
      }),
    });
    const cards = new StripePaymentCustomerCards(client);

    // act
    const card = await cards.readDefaultCard("cus_1");

    // assert
    expect(card).toEqual(VISA);
    expect(client.customers.retrieve).toHaveBeenCalledWith("cus_1", {
      expand: ["subscriptions"],
    });
    expect(client.paymentMethods.retrieve).toHaveBeenCalledWith("pm_visa");
  });

  it("falls back to the default payment method of her current subscription", async () => {
    // arrange
    const client = createStubClient({
      customer: customer({
        subscriptions: {
          object: "list",
          data: [
            { id: "sub_new", default_payment_method: null },
            { id: "sub_1", default_payment_method: { id: "pm_visa" } },
          ],
        },
      }),
    });
    const cards = new StripePaymentCustomerCards(client);

    // act
    const card = await cards.readDefaultCard("cus_1");

    // assert
    expect(card).toEqual(VISA);
    expect(client.paymentMethods.retrieve).toHaveBeenCalledWith("pm_visa");
  });

  it("reads no card without asking for a payment method when none is the default", async () => {
    // arrange
    const client = createStubClient({ customer: customer() });
    const cards = new StripePaymentCustomerCards(client);

    // act
    const card = await cards.readDefaultCard("cus_1");

    // assert
    expect(card).toBeNull();
    expect(client.paymentMethods.retrieve).not.toHaveBeenCalled();
  });

  it("reads no card for a deleted customer", async () => {
    // arrange
    const client = createStubClient({
      customer: { id: "cus_1", object: "customer", deleted: true },
    });
    const cards = new StripePaymentCustomerCards(client);

    // act
    const card = await cards.readDefaultCard("cus_1");

    // assert
    expect(card).toBeNull();
  });

  it("reads no card when the default payment method is not a card", async () => {
    // arrange
    const client = createStubClient({
      customer: customer({
        invoice_settings: { default_payment_method: "pm_debit" },
      }),
      paymentMethod: {
        id: "pm_debit",
        object: "payment_method",
        type: "sepa_debit",
        customer: "cus_1",
      },
    });
    const cards = new StripePaymentCustomerCards(client);

    // act
    const card = await cards.readDefaultCard("cus_1");

    // assert
    expect(card).toBeNull();
  });

  it("lets a provider failure through so the caller can retry", async () => {
    // arrange
    const failure = new Error("Stripe is down");
    const client = createStubClient({ customer: customer() });
    client.customers.retrieve.mockRejectedValue(failure);
    const cards = new StripePaymentCustomerCards(client);

    // act
    const reading = cards.readDefaultCard("cus_1");

    // assert
    await expect(reading).rejects.toBe(failure);
  });
});
