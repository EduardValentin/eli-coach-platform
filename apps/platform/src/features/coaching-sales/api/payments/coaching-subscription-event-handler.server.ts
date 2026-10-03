import {
  COACHING_SUBSCRIPTION_PURPOSE,
  type ReconcileSubscriptionEventUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import {
  toSubscriptionEvent,
  type PaymentEventHandling,
  type PaymentRefund,
  type PaymentRefundHandler,
  type PaymentSubscriptionChange,
  type PaymentSubscriptionChangeHandler,
} from "@eli-coach-platform/infrastructure/payments/server";

type CoachingSubscriptionEventHandlerOptions = {
  reconcileSubscriptionEvent: ReconcileSubscriptionEventUseCase;
};

export class CoachingSubscriptionEventHandler
  implements PaymentSubscriptionChangeHandler, PaymentRefundHandler
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

    const reconciled = await this.options.reconcileSubscriptionEvent.execute({
      eventId,
      event,
    });

    return reconciled.status;
  }
}
