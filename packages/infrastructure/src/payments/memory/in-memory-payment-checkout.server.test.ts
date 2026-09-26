import type { CreateCheckoutSessionCommand } from "@eli-coach-platform/domain/coaching-subscription";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryPaymentCheckout } from "./in-memory-payment-checkout.server";

function sessionCommand(customerId: string): CreateCheckoutSessionCommand {
  return {
    customerId,
    bundle: {
      id: "6-months",
      title: "6 Months",
      months: 6,
      amountCents: 71400,
    },
    currency: "eur",
    metadata: {
      assessmentCallId: "call-1",
      bundleId: "6-months",
      tier: "reduced",
      startChoice: "waiting",
    },
    successUrl:
      "http://localhost:3000/checkout/complete?session={CHECKOUT_SESSION_ID}",
    cancelUrl:
      "http://localhost:3000/select-bundle?token=abc&payment=cancelled",
  };
}

describe("InMemoryPaymentCheckout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the success URL carrying the new session id as the checkout URL", async () => {
    // arrange
    const checkout = new InMemoryPaymentCheckout();
    const customer = await checkout.createCustomer({
      email: "sofia@example.com",
      assessmentCallId: "call-1",
    });

    // act
    const session = await checkout.createSession(sessionCommand(customer.id));

    // assert
    expect(session.url).toBe(
      `http://localhost:3000/checkout/complete?session=${session.id}`,
    );
  });

  it("answers every remembered session as paid when it was created, with the command's amounts and choices", async () => {
    // arrange
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-26T10:00:00.000Z"));
    const checkout = new InMemoryPaymentCheckout();
    const customer = await checkout.createCustomer({
      email: "sofia@example.com",
      assessmentCallId: "call-1",
    });
    const session = await checkout.createSession(sessionCommand(customer.id));

    // act
    const completion = await checkout.findCompletedSession(session.id);

    // assert
    expect(completion).toEqual({
      checkoutSessionId: session.id,
      paymentCustomerId: customer.id,
      paymentSubscriptionId: expect.any(String),
      amountCents: 71400,
      currency: "eur",
      customerEmail: "sofia@example.com",
      paidAt: new Date("2026-09-26T10:00:00.000Z"),
      assessmentCallId: "call-1",
      bundleId: "6-months",
      tier: "reduced",
      startChoice: "waiting",
    });
  });

  it("gives each session its own id", async () => {
    // arrange
    const checkout = new InMemoryPaymentCheckout();
    const customer = await checkout.createCustomer({
      email: "sofia@example.com",
      assessmentCallId: "call-1",
    });

    // act
    const first = await checkout.createSession(sessionCommand(customer.id));
    const second = await checkout.createSession(sessionCommand(customer.id));

    // assert
    expect(first.id).not.toBe(second.id);
  });

  it("finds nothing for a session it never created", async () => {
    // arrange
    const checkout = new InMemoryPaymentCheckout();

    // act
    const completion = await checkout.findCompletedSession("cs_unknown");

    // assert
    expect(completion).toBeNull();
  });

  it("finds nothing for an expired session", async () => {
    // arrange
    const checkout = new InMemoryPaymentCheckout();
    const customer = await checkout.createCustomer({
      email: "sofia@example.com",
      assessmentCallId: "call-1",
    });
    const session = await checkout.createSession(sessionCommand(customer.id));
    await checkout.expireSession(session.id);

    // act
    const completion = await checkout.findCompletedSession(session.id);

    // assert
    expect(completion).toBeNull();
  });

  it("finds nothing for a session whose customer it never created", async () => {
    // arrange
    const checkout = new InMemoryPaymentCheckout();
    const session = await checkout.createSession(
      sessionCommand("cus_from_an_earlier_process"),
    );

    // act
    const completion = await checkout.findCompletedSession(session.id);

    // assert
    expect(completion).toBeNull();
  });
});
