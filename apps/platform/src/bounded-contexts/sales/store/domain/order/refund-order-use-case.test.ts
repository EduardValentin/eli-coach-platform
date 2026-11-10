import { describe, expect, it, vi } from "vitest";

import type { DownloadGrantsPort } from "../download-grant";
import { StoreRecipientEmail } from "../store-recipient-email";

import { DeliveryConsent } from "./delivery-consent";
import { Order } from "./order";
import { OrderCheckout } from "./order-checkout";
import { OrderConsents } from "./order-consents";
import type { OrderIncidentsPort } from "./order-incidents-port";
import { OrderItem } from "./order-item";
import { OrderPayment } from "./order-payment";
import { OrderRefund } from "./order-refund";
import type { PaymentEventLedgerPort } from "./payment-event-ledger-port";
import { RefundOrderUseCase } from "./refund-order-use-case";
import type { StoreOrdersPort } from "./store-orders-port";

const placedAt = new Date("2026-11-09T10:00:00.000Z");
const paidAt = new Date("2026-11-09T10:05:00.000Z");
const firstRefundedAt = new Date("2026-11-10T09:00:00.000Z");
const laterRefundedAt = new Date("2026-11-11T09:00:00.000Z");
const now = new Date("2026-11-11T09:00:05.000Z");

function storedOrder(
  state: Pick<
    Parameters<typeof Order.reconstitute>[0],
    "status" | "payment" | "refund"
  >,
): Order {
  return Order.reconstitute({
    id: "order-1",
    recipientEmail: StoreRecipientEmail.reconstitute({
      address: "woman@example.com",
    }),
    currency: "EUR",
    items: [
      OrderItem.reconstitute({
        productId: 1,
        productSlug: "fat-loss-30",
        productVersionId: 10,
        title: "30-Day Fat Loss Plan",
        amountMinorUnits: 3900,
      }),
      OrderItem.reconstitute({
        productId: 3,
        productSlug: "hormone-harmony",
        productVersionId: 30,
        title: "Hormone Harmony E-Book",
        amountMinorUnits: 0,
      }),
    ],
    checkout: OrderCheckout.reconstitute({
      sessionId: "cs_test_order",
      url: "https://checkout.stripe.com/c/pay/cs_test_order",
    }),
    consents: OrderConsents.reconstitute({
      termsVersion: "1.0",
      privacyPolicyVersion: "2.3",
      marketingConsentVersion: "store-1",
      marketingConsent: false,
      marketingConsentedAt: null,
    }),
    deliveryConsent: DeliveryConsent.reconstitute({
      termsVersion: "1.0",
      consentedAt: placedAt,
    }),
    idempotencyKey: "5e0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a",
    payloadDigest: "d".repeat(64),
    placedAt,
    ...state,
  });
}

const payment = OrderPayment.reconstitute({
  checkoutSessionId: "cs_test_order",
  paymentIntentId: "pi_order",
  amountMinorUnits: 3900,
  currency: "EUR",
  paidAt,
});

const paidOrder = storedOrder({ status: "paid", payment, refund: null });
const refundedOrder = storedOrder({
  status: "refunded",
  payment,
  refund: OrderRefund.reconstitute({
    refundedMinorUnits: 1500,
    refundedAt: firstRefundedAt,
  }),
});
const pendingOrder = storedOrder({
  status: "pending",
  payment: null,
  refund: null,
});

function createRefundOrderUseCase(options: {
  lockedOrder: Order | null;
  ledgerOutcome?: "recorded" | "duplicate";
}) {
  const storeOrdersPort = {
    lockByPaymentIntent: vi.fn().mockResolvedValue(options.lockedOrder),
    recordRefund: vi.fn().mockResolvedValue(undefined),
  } satisfies Pick<StoreOrdersPort, "lockByPaymentIntent" | "recordRefund">;
  const downloadGrantsPort = {
    revokeForOrder: vi.fn().mockResolvedValue(undefined),
  } satisfies Pick<DownloadGrantsPort, "revokeForOrder">;
  const paymentEventLedgerPort = {
    record: vi.fn().mockResolvedValue(options.ledgerOutcome ?? "recorded"),
  } satisfies PaymentEventLedgerPort;
  const orderIncidentsPort = {
    orderRefunded: vi.fn(),
  } satisfies Pick<OrderIncidentsPort, "orderRefunded">;
  const refundOrderUseCase = new RefundOrderUseCase({
    storeOrdersPort,
    downloadGrantsPort,
    paymentEventLedgerPort,
    orderIncidentsPort,
    clockPort: { now: () => now },
  });

  return {
    downloadGrantsPort,
    orderIncidentsPort,
    paymentEventLedgerPort,
    refundOrderUseCase,
    storeOrdersPort,
  };
}

describe("RefundOrderUseCase", () => {
  it("answers unowned for a payment no order holds and records nothing, not even the event", async () => {
    // arrange
    const {
      downloadGrantsPort,
      orderIncidentsPort,
      paymentEventLedgerPort,
      refundOrderUseCase,
      storeOrdersPort,
    } = createRefundOrderUseCase({ lockedOrder: null });

    // act
    const result = await refundOrderUseCase.execute({
      eventId: "evt_refunded",
      paymentIntentId: "pi_subscription",
      refundedMinorUnits: 3900,
      refundedAt: firstRefundedAt,
    });

    // assert
    expect(result).toEqual({ status: "unowned" });
    expect(storeOrdersPort.lockByPaymentIntent).toHaveBeenCalledWith(
      "pi_subscription",
    );
    expect(paymentEventLedgerPort.record).not.toHaveBeenCalled();
    expect(storeOrdersPort.recordRefund).not.toHaveBeenCalled();
    expect(downloadGrantsPort.revokeForOrder).not.toHaveBeenCalled();
    expect(orderIncidentsPort.orderRefunded).not.toHaveBeenCalled();
  });

  it("marks a paid order refunded, revokes its download access and logs it, after locking it and recording the event", async () => {
    // arrange
    const {
      downloadGrantsPort,
      orderIncidentsPort,
      paymentEventLedgerPort,
      refundOrderUseCase,
      storeOrdersPort,
    } = createRefundOrderUseCase({ lockedOrder: paidOrder });

    // act
    const result = await refundOrderUseCase.execute({
      eventId: "evt_refunded",
      paymentIntentId: "pi_order",
      refundedMinorUnits: 1500,
      refundedAt: firstRefundedAt,
    });

    // assert
    expect(result).toEqual({ status: "refunded" });
    expect(paymentEventLedgerPort.record).toHaveBeenCalledWith({
      eventId: "evt_refunded",
      receivedAt: now,
    });
    expect(
      storeOrdersPort.lockByPaymentIntent.mock.invocationCallOrder[0],
    ).toBeLessThan(paymentEventLedgerPort.record.mock.invocationCallOrder[0]!);
    const [[recorded]] = storeOrdersPort.recordRefund.mock.calls as [[Order]];
    expect(recorded.status).toBe("refunded");
    expect(recorded.refund?.toSnapshot()).toEqual({
      refundedMinorUnits: 1500,
      refundedAt: firstRefundedAt,
    });
    expect(downloadGrantsPort.revokeForOrder).toHaveBeenCalledWith("order-1");
    expect(orderIncidentsPort.orderRefunded).toHaveBeenCalledWith({
      orderId: "order-1",
      refundedMinorUnits: 1500,
      currency: "EUR",
    });
  });

  it("answers duplicate for an event it already recorded and changes nothing", async () => {
    // arrange
    const {
      downloadGrantsPort,
      orderIncidentsPort,
      refundOrderUseCase,
      storeOrdersPort,
    } = createRefundOrderUseCase({
      lockedOrder: paidOrder,
      ledgerOutcome: "duplicate",
    });

    // act
    const result = await refundOrderUseCase.execute({
      eventId: "evt_refunded",
      paymentIntentId: "pi_order",
      refundedMinorUnits: 1500,
      refundedAt: firstRefundedAt,
    });

    // assert
    expect(result).toEqual({ status: "duplicate" });
    expect(storeOrdersPort.recordRefund).not.toHaveBeenCalled();
    expect(downloadGrantsPort.revokeForOrder).not.toHaveBeenCalled();
    expect(orderIncidentsPort.orderRefunded).not.toHaveBeenCalled();
  });

  it("updates only the refunded amount on a later refund of an already refunded order", async () => {
    // arrange
    const {
      downloadGrantsPort,
      orderIncidentsPort,
      refundOrderUseCase,
      storeOrdersPort,
    } = createRefundOrderUseCase({ lockedOrder: refundedOrder });

    // act
    const result = await refundOrderUseCase.execute({
      eventId: "evt_refunded_again",
      paymentIntentId: "pi_order",
      refundedMinorUnits: 3900,
      refundedAt: laterRefundedAt,
    });

    // assert
    expect(result).toEqual({ status: "refunded" });
    const [[recorded]] = storeOrdersPort.recordRefund.mock.calls as [[Order]];
    expect(recorded.refund?.toSnapshot()).toEqual({
      refundedMinorUnits: 3900,
      refundedAt: firstRefundedAt,
    });
    expect(downloadGrantsPort.revokeForOrder).not.toHaveBeenCalled();
    expect(orderIncidentsPort.orderRefunded).not.toHaveBeenCalled();
  });

  it("changes nothing for an order still waiting for its payment", async () => {
    // arrange
    const { downloadGrantsPort, refundOrderUseCase, storeOrdersPort } =
      createRefundOrderUseCase({ lockedOrder: pendingOrder });

    // act
    const result = await refundOrderUseCase.execute({
      eventId: "evt_refunded",
      paymentIntentId: "pi_order",
      refundedMinorUnits: 1500,
      refundedAt: firstRefundedAt,
    });

    // assert
    expect(result).toEqual({ status: "not_paid" });
    expect(storeOrdersPort.recordRefund).not.toHaveBeenCalled();
    expect(downloadGrantsPort.revokeForOrder).not.toHaveBeenCalled();
  });
});
