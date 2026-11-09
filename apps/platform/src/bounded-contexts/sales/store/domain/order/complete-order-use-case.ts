import {
  STORE_DELIVERY_LIMIT_POLICY,
  type DownloadTokenGeneratorPort,
} from "../acquisition";
import type { ClockPort } from "../clock-port";

import type { Order } from "./order";
import type { OrderDeliveryPort } from "./order-delivery-port";
import type { OrderEmailDelivery } from "./order-email-delivery";
import type { OrderIncidentsPort } from "./order-incidents-port";
import { OrderPayment, type OrderPaymentSnapshot } from "./order-payment";
import type { PaymentEventLedgerPort } from "./payment-event-ledger-port";
import type { StoreOrdersPort } from "./store-orders-port";

export type OrderPaymentEvent = {
  eventId: string;
  orderId: string;
  payment: OrderPaymentSnapshot;
};

export type CompleteOrderResult =
  | { status: "completed"; delivery: OrderEmailDelivery }
  | { status: "duplicate" }
  | { status: "already_paid" }
  | { status: "unknown_order" };

type CompleteOrderUseCaseOptions = {
  storeOrdersPort: StoreOrdersPort;
  paymentEventLedgerPort: PaymentEventLedgerPort;
  orderIncidentsPort: OrderIncidentsPort;
  clockPort: ClockPort;
  downloadTokenGeneratorPort: DownloadTokenGeneratorPort;
  orderDeliveryPort: Pick<
    OrderDeliveryPort,
    "provider" | "createProviderIdempotencyKey"
  >;
};

export class CompleteOrderUseCase {
  constructor(private readonly options: CompleteOrderUseCaseOptions) {}

  async execute(event: OrderPaymentEvent): Promise<CompleteOrderResult> {
    const at = this.options.clockPort.now();
    const ledgerOutcome = await this.options.paymentEventLedgerPort.record({
      eventId: event.eventId,
      receivedAt: at,
    });

    if (ledgerOutcome === "duplicate") {
      return { status: "duplicate" };
    }

    const order = await this.options.storeOrdersPort.findForPayment(
      event.orderId,
    );

    if (!order) {
      this.options.orderIncidentsPort.paidOrderUnknown({
        eventId: event.eventId,
        orderId: event.orderId,
      });

      return { status: "unknown_order" };
    }

    const payment = OrderPayment.received(event.payment);
    const outcome = order.markPaid(payment);

    if (outcome.status === "already_paid") {
      return outcome;
    }

    if (order.chargeDiffers(payment)) {
      this.reportAmountMismatch(order, payment);
    }

    return {
      status: "completed",
      delivery: await this.issueGrant(outcome.order, at),
    };
  }

  private async issueGrant(
    order: Order,
    at: Date,
  ): Promise<OrderEmailDelivery> {
    const token = this.options.downloadTokenGeneratorPort.create();
    const attempt = {
      provider: this.options.orderDeliveryPort.provider,
      providerIdempotencyKey:
        this.options.orderDeliveryPort.createProviderIdempotencyKey(
          order.emailAttemptKey(token.sha256),
        ),
    };
    const { deliveryAttemptId } =
      await this.options.storeOrdersPort.recordPayment({
        order,
        tokenSha256: token.sha256,
        grantExpiresAt: new Date(
          at.getTime() + STORE_DELIVERY_LIMIT_POLICY.grantDurationMs,
        ),
        attempt,
        at,
      });

    return {
      order,
      deliveryAttemptId,
      ...attempt,
      rawToken: token.rawToken,
      at,
    };
  }

  private reportAmountMismatch(order: Order, payment: OrderPayment): void {
    this.options.orderIncidentsPort.paymentAmountMismatch({
      orderId: order.id,
      expectedMinorUnits: order.total(),
      expectedCurrency: order.currency,
      chargedMinorUnits: payment.amountMinorUnits,
      chargedCurrency: payment.currency,
    });
  }
}
