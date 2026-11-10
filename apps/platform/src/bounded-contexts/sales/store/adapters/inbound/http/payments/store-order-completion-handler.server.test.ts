import { describe, expect, it, vi } from "vitest";

import type {
  CompleteOrderResult,
  CompleteOrderUseCase,
  DeliverOrderEmailUseCase,
  OrderEmailDelivery,
} from "~/bounded-contexts/sales/store/domain/order";
import type { PaidCheckoutSession } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

import { StoreOrderCompletionHandler } from "./store-order-completion-handler.server";

const ORDER_ID = "0b6c2f0e-5a4d-4e7b-9d61-3a2b1c0d9e8f";
const paidAt = new Date("2026-11-09T10:05:00.000Z");

const session: PaidCheckoutSession = {
  id: "cs_test_order",
  customerId: null,
  subscriptionId: null,
  paymentIntentId: "pi_order",
  amountCents: 3900,
  currency: "eur",
  customerEmail: "woman@example.com",
  paidAt,
  metadata: { purpose: "store-order", orderId: ORDER_ID },
};

function createHandler(result: CompleteOrderResult) {
  const events: string[] = [];
  const completeExecute = vi.fn(async () => {
    events.push("completed");
    return result;
  });
  const deliverExecute = vi.fn(async () => {
    events.push("delivered");
    return "sent";
  });
  const unitOfWork: UnitOfWork = async (work) => {
    events.push("unit-of-work-opened");
    const outcome = await work();
    events.push("unit-of-work-committed");
    return outcome;
  };
  const handler = new StoreOrderCompletionHandler({
    completeOrderUseCase: {
      execute: completeExecute,
    } as unknown as CompleteOrderUseCase,
    deliverOrderEmailUseCase: {
      execute: deliverExecute,
    } as unknown as DeliverOrderEmailUseCase,
    unitOfWork,
  });

  return { completeExecute, deliverExecute, events, handler };
}

describe("StoreOrderCompletionHandler", () => {
  it("completes the order in one unit of work and sends its email after commit", async () => {
    // arrange
    const delivery = { deliveryAttemptId: 51 } as OrderEmailDelivery;
    const { completeExecute, deliverExecute, events, handler } = createHandler({
      status: "completed",
      delivery,
    });

    // act
    const outcome = await handler.handle("evt_paid", session);

    // assert
    expect(handler.purpose).toBe("store-order");
    expect(outcome).toBe("recorded");
    expect(events).toEqual([
      "unit-of-work-opened",
      "completed",
      "unit-of-work-committed",
      "delivered",
    ]);
    expect(completeExecute).toHaveBeenCalledWith({
      eventId: "evt_paid",
      orderId: ORDER_ID,
      payment: {
        checkoutSessionId: "cs_test_order",
        paymentIntentId: "pi_order",
        amountMinorUnits: 3900,
        currency: "eur",
        paidAt,
      },
    });
    expect(deliverExecute).toHaveBeenCalledWith(delivery);
  });

  it("sends nothing for a duplicate, an already paid or an unknown order, or another session", async () => {
    // arrange
    const handlers = (
      [
        { status: "duplicate" },
        { status: "already_paid" },
        { status: "unknown_order" },
        { status: "session_mismatch" },
      ] as const
    ).map((result) => createHandler(result));

    // act
    const outcomes = await Promise.all(
      handlers.map(({ handler }) => handler.handle("evt_paid", session)),
    );

    // assert
    expect(outcomes).toEqual(["duplicate", "ignored", "ignored", "ignored"]);
    expect(
      handlers.every(({ deliverExecute }) => !deliverExecute.mock.calls.length),
    ).toBe(true);
  });

  it("ignores a session whose order reference is not one of ours", async () => {
    // arrange
    const { completeExecute, handler } = createHandler({ status: "duplicate" });

    // act
    const outcome = await handler.handle("evt_paid", {
      ...session,
      metadata: { purpose: "store-order", orderId: "not-an-order" },
    });

    // assert
    expect(outcome).toBe("ignored");
    expect(completeExecute).not.toHaveBeenCalled();
  });
});
