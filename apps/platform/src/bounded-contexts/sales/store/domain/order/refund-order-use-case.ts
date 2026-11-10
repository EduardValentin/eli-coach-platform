import type { ClockPort } from "../clock-port";
import type { DownloadGrantsPort } from "../download-grant";

import type { Order } from "./order";
import type { OrderIncidentsPort } from "./order-incidents-port";
import { OrderRefund } from "./order-refund";
import type { PaymentEventLedgerPort } from "./payment-event-ledger-port";
import type { StoreOrdersPort } from "./store-orders-port";

export type OrderRefundEvent = {
  eventId: string;
  paymentIntentId: string;
  refundedMinorUnits: number;
  refundedAt: Date;
};

export type RefundOrderResult =
  | { status: "refunded" }
  | { status: "duplicate" }
  | { status: "unowned" }
  | { status: "not_paid" };

type RefundOrderUseCaseOptions = {
  storeOrdersPort: Pick<
    StoreOrdersPort,
    "lockByPaymentIntent" | "recordRefund"
  >;
  downloadGrantsPort: Pick<DownloadGrantsPort, "revokeForOrder">;
  paymentEventLedgerPort: PaymentEventLedgerPort;
  orderIncidentsPort: Pick<OrderIncidentsPort, "orderRefunded">;
  clockPort: ClockPort;
};

export class RefundOrderUseCase {
  constructor(private readonly options: RefundOrderUseCaseOptions) {}

  async execute(event: OrderRefundEvent): Promise<RefundOrderResult> {
    const order = await this.options.storeOrdersPort.lockByPaymentIntent(
      event.paymentIntentId,
    );

    if (!order) {
      return { status: "unowned" };
    }

    const ledgerOutcome = await this.options.paymentEventLedgerPort.record({
      eventId: event.eventId,
      receivedAt: this.options.clockPort.now(),
    });

    if (ledgerOutcome === "duplicate") {
      return { status: "duplicate" };
    }

    const refund = OrderRefund.received({
      refundedMinorUnits: event.refundedMinorUnits,
      refundedAt: event.refundedAt,
    });
    const outcome = order.refundWith(refund);

    if (outcome.status === "not_paid") {
      return outcome;
    }

    await this.options.storeOrdersPort.recordRefund(outcome.order);

    if (outcome.firstRefund) {
      await this.revokeAccess(outcome.order, refund);
    }

    return { status: "refunded" };
  }

  private async revokeAccess(order: Order, refund: OrderRefund): Promise<void> {
    await this.options.downloadGrantsPort.revokeForOrder(order.id);
    this.options.orderIncidentsPort.orderRefunded({
      orderId: order.id,
      refundedMinorUnits: refund.refundedMinorUnits,
      currency: order.currency,
    });
  }
}
