import {
  COACHING_SUBSCRIPTION_PURPOSE,
  type ReconcileSubscriptionEventUseCase,
} from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription";
import { toSubscriptionEvent } from "~/bounded-contexts/sales/subscriptions/adapters/outbound/payments/coaching-subscription-change.server";
import type { PaymentEventHandling } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-event-handlers.server";
import type { PaymentRefundHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-refund-handler-port.server";
import type { PaymentSubscriptionChangeHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-subscription-change-handler-port.server";
import type {
  PaymentRefund,
  PaymentSubscriptionChange,
} from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";

type CoachingSubscriptionEventHandlerOptions = {
  reconcileSubscriptionEventUseCase: ReconcileSubscriptionEventUseCase;
};

export class CoachingSubscriptionEventHandler
  implements PaymentSubscriptionChangeHandlerPort, PaymentRefundHandlerPort
{
  readonly purpose = COACHING_SUBSCRIPTION_PURPOSE;

  constructor(
    private readonly options: CoachingSubscriptionEventHandlerOptions,
  ) {}

  async handle(
    eventId: string,
    change: PaymentSubscriptionChange | PaymentRefund,
  ): Promise<PaymentEventHandling> {
    const event = toSubscriptionEvent(change);

    if (!event) {
      return "ignored";
    }

    const reconciled =
      await this.options.reconcileSubscriptionEventUseCase.execute({
        eventId,
        event,
      });

    return reconciled.status;
  }
}
