import {
  COACHING_SUBSCRIPTION_PURPOSE,
  type RecordCheckoutCompletedUseCase,
  type RefreshPaymentCardUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type {
  PaidCheckoutSession,
  PaymentCompletionHandler,
} from "@eli-coach-platform/infrastructure/payments/server";

type HandlerOutcome = Awaited<ReturnType<PaymentCompletionHandler["handle"]>>;

type RecordStatus = Awaited<
  ReturnType<RecordCheckoutCompletedUseCase["execute"]>
>["status"];

type CoachingPurchaseCompletionHandlerOptions = {
  recordCheckoutCompleted: RecordCheckoutCompletedUseCase;
  refreshPaymentCard: RefreshPaymentCardUseCase;
};

const OUTCOME_BY_RECORD_STATUS: Record<RecordStatus, HandlerOutcome> = {
  recorded: "recorded",
  duplicate: "duplicate",
  already_paid: "ignored",
  call_not_found: "ignored",
  unreadable_checkout: "ignored",
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
    const recorded = await this.options.recordCheckoutCompleted.execute({
      eventId,
      checkoutSessionId: session.id,
    });

    if (recorded.status === "recorded" || recorded.status === "duplicate") {
      await this.options.refreshPaymentCard.execute({
        paymentCustomerId: recorded.paymentCustomerId,
      });
    }

    return OUTCOME_BY_RECORD_STATUS[recorded.status];
  }
}
