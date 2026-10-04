import {
  COACHING_SUBSCRIPTION_PURPOSE,
  type CoachingSubscriptionIncidents,
  type RecordCheckoutCompletedUseCase,
  type RefreshPaymentCardUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import {
  toCheckoutCompletion,
  type PaidCheckoutSession,
  type PaymentCompletionHandler,
} from "@eli-coach-platform/infrastructure/payments/server";

type HandlerOutcome = Awaited<ReturnType<PaymentCompletionHandler["handle"]>>;

type RecordStatus = Awaited<
  ReturnType<RecordCheckoutCompletedUseCase["execute"]>
>["status"];

type CoachingPurchaseCompletionHandlerOptions = {
  incidents: CoachingSubscriptionIncidents;
  recordCheckoutCompleted: RecordCheckoutCompletedUseCase;
  refreshPaymentCard: RefreshPaymentCardUseCase;
};

const OUTCOME_BY_RECORD_STATUS: Record<RecordStatus, HandlerOutcome> = {
  recorded: "recorded",
  duplicate: "duplicate",
  already_paid: "ignored",
  call_not_found: "ignored",
};

export class CoachingPurchaseCompletionHandler implements PaymentCompletionHandler {
  readonly purpose = COACHING_SUBSCRIPTION_PURPOSE;

  constructor(
    private readonly options: CoachingPurchaseCompletionHandlerOptions,
  ) {}

  async handle(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<HandlerOutcome> {
    const completion = toCheckoutCompletion(session);

    if (!completion) {
      this.options.incidents.paymentEventRejected({
        eventId,
        reason: "unreadable_checkout",
      });

      return "ignored";
    }

    const recorded = await this.options.recordCheckoutCompleted.execute({
      ...completion,
      eventId,
    });

    const outcome = OUTCOME_BY_RECORD_STATUS[recorded.status];

    if (outcome !== "ignored") {
      await this.options.refreshPaymentCard.execute({
        paymentCustomerId: completion.paymentCustomerId,
      });
    }

    return outcome;
  }
}
