import type {
  RefundOrderResult,
  RefundOrderUseCase,
} from "~/bounded-contexts/sales/store/domain/order";
import type { PaymentRefundHandling } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-event-handlers.server";
import type { PaymentRefundHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-refund-handler-port.server";
import type { PaymentRefund } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";

type StoreOrderRefundHandlerOptions = {
  refundOrderUseCase: RefundOrderUseCase;
};

const HANDLING_BY_REFUND: Record<
  RefundOrderResult["status"],
  PaymentRefundHandling
> = {
  refunded: "recorded",
  duplicate: "duplicate",
  unowned: "unowned",
  not_paid: "ignored",
};

export class StoreOrderRefundHandler implements PaymentRefundHandlerPort {
  constructor(private readonly options: StoreOrderRefundHandlerOptions) {}

  async handle(
    eventId: string,
    refund: PaymentRefund,
  ): Promise<PaymentRefundHandling> {
    const result = await this.options.refundOrderUseCase.execute({
      eventId,
      paymentIntentId: refund.paymentIntentId,
      refundedMinorUnits: refund.refundedCents,
      refundedAt: refund.refundedAt,
    });

    return HANDLING_BY_REFUND[result.status];
  }
}
