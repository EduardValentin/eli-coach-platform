import { z } from "zod";

import {
  STORE_ORDER_PURPOSE,
  type CompleteOrderResult,
  type CompleteOrderUseCase,
  type DeliverOrderEmailUseCase,
} from "~/bounded-contexts/sales/store/domain/order";
import type { PaymentCompletionHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-completion-handler-port.server";
import type { PaidCheckoutSession } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type HandlerOutcome = Awaited<
  ReturnType<PaymentCompletionHandlerPort["handle"]>
>;

type StoreOrderCompletionHandlerOptions = {
  completeOrderUseCase: CompleteOrderUseCase;
  deliverOrderEmailUseCase: DeliverOrderEmailUseCase;
  unitOfWork: UnitOfWork;
};

const OUTCOME_BY_COMPLETION: Record<
  CompleteOrderResult["status"],
  HandlerOutcome
> = {
  completed: "recorded",
  duplicate: "duplicate",
  already_paid: "ignored",
  unknown_order: "ignored",
  session_mismatch: "ignored",
};

const storeOrderMetadataSchema = z.object({ orderId: z.uuid() });

export class StoreOrderCompletionHandler implements PaymentCompletionHandlerPort {
  readonly purpose = STORE_ORDER_PURPOSE;

  constructor(private readonly options: StoreOrderCompletionHandlerOptions) {}

  async handle(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<HandlerOutcome> {
    const metadata = storeOrderMetadataSchema.safeParse(session.metadata);

    if (!metadata.success) {
      return "ignored";
    }

    const completion = await this.options.unitOfWork(() =>
      this.options.completeOrderUseCase.execute({
        eventId,
        orderId: metadata.data.orderId,
        payment: {
          checkoutSessionId: session.id,
          paymentIntentId: session.paymentIntentId,
          amountMinorUnits: session.amountCents,
          currency: session.currency,
          paidAt: session.paidAt,
        },
      }),
    );

    if (completion.status === "completed") {
      await this.options.deliverOrderEmailUseCase.execute(completion.delivery);
    }

    return OUTCOME_BY_COMPLETION[completion.status];
  }
}
