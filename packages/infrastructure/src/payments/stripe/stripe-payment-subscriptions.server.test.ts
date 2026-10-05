import { describe, expect, it, vi } from "vitest";

import { StripePaymentSubscriptions } from "./stripe-payment-subscriptions.server";

const RETURN_URL = "https://evoa.fit/client/settings";

function createStubClient() {
  return {
    subscriptions: {
      update: vi.fn().mockResolvedValue({ id: "sub_1" }),
      cancel: vi.fn().mockResolvedValue({ id: "sub_1" }),
    },
    billingPortal: {
      sessions: {
        create: vi
          .fn()
          .mockResolvedValue({ url: "https://billing.stripe.com/p/session" }),
      },
    },
  };
}

describe("StripePaymentSubscriptions", () => {
  it("holds the renewal by pausing collection with every cycle invoice voided", async () => {
    // arrange
    const client = createStubClient();
    const subscriptions = new StripePaymentSubscriptions(client);

    // act
    await subscriptions.holdRenewal("sub_1");

    // assert
    expect(client.subscriptions.update).toHaveBeenCalledWith("sub_1", {
      pause_collection: { behavior: "void" },
    });
  });

  it("ends a subscription now without proration or a final invoice", async () => {
    // arrange
    const client = createStubClient();
    const subscriptions = new StripePaymentSubscriptions(client);

    // act
    await subscriptions.endNow("sub_1");

    // assert
    expect(client.subscriptions.cancel).toHaveBeenCalledWith("sub_1", {
      prorate: false,
      invoice_now: false,
    });
  });

  it("schedules the end at an explicit instant without proration", async () => {
    // arrange
    const client = createStubClient();
    const subscriptions = new StripePaymentSubscriptions(client);

    // act
    await subscriptions.endAt({
      paymentSubscriptionId: "sub_1",
      at: new Date("2027-01-02T10:00:00.000Z"),
    });

    // assert
    expect(client.subscriptions.update).toHaveBeenCalledWith("sub_1", {
      cancel_at: 1798884000,
      proration_behavior: "none",
    });
  });

  it("opens the portal on the payment-method update flow and sends her back when she is done", async () => {
    // arrange
    const client = createStubClient();
    const subscriptions = new StripePaymentSubscriptions(client);

    // act
    const session = await subscriptions.openPaymentMethodSession({
      paymentCustomerId: "cus_1",
      returnUrl: RETURN_URL,
    });

    // assert
    expect(session).toEqual({ url: "https://billing.stripe.com/p/session" });
    expect(client.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: RETURN_URL,
      flow_data: {
        type: "payment_method_update",
        after_completion: {
          type: "redirect",
          redirect: { return_url: RETURN_URL },
        },
      },
    });
  });

  it("opens the portal on the pinned customer-portal configuration when one is set", async () => {
    // arrange
    const client = createStubClient();
    const subscriptions = new StripePaymentSubscriptions(client, {
      portalConfigurationId: "bpc_pinned",
    });

    // act
    await subscriptions.openPaymentMethodSession({
      paymentCustomerId: "cus_1",
      returnUrl: RETURN_URL,
    });

    // assert
    expect(client.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        configuration: "bpc_pinned",
        customer: "cus_1",
      }),
    );
  });

  it("propagates a provider failure", async () => {
    // arrange
    const failure = new Error("provider down");
    const client = createStubClient();
    client.subscriptions.cancel.mockRejectedValue(failure);
    const subscriptions = new StripePaymentSubscriptions(client);

    // act
    const ending = subscriptions.endNow("sub_1");

    // assert
    await expect(ending).rejects.toBe(failure);
  });
});
