import type { UnitOfWork } from "~/shared/http/unit-of-work";
import {
  CallAlreadyPaid,
  COACHING_SUBSCRIPTION_PURPOSE,
  type CheckoutPurchase,
  type FinishCheckoutPurchaseUseCase,
  type ReadCheckoutPurchaseUseCase,
  type RecordCheckoutPurchaseUseCase,
  type RecordedCheckoutPurchase,
  type RefreshPaymentCardUseCase,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { PaidCheckoutSession } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import type { PaymentCompletionHandler } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-completion-handler.server";

type HandlerOutcome = Awaited<ReturnType<PaymentCompletionHandler["handle"]>>;

type PurchaseRecording = RecordedCheckoutPurchase | { status: "already_paid" };

type PurchaseStatus =
  | Exclude<
      Awaited<ReturnType<ReadCheckoutPurchaseUseCase["execute"]>>["status"],
      "found"
    >
  | PurchaseRecording["status"];

type CoachingPurchaseCompletionHandlerOptions = {
  finishCheckoutPurchase: FinishCheckoutPurchaseUseCase;
  readCheckoutPurchase: ReadCheckoutPurchaseUseCase;
  recordCheckoutPurchase: RecordCheckoutPurchaseUseCase;
  refreshPaymentCard: RefreshPaymentCardUseCase;
  unitOfWork: UnitOfWork;
};

const OUTCOME_BY_PURCHASE_STATUS: Record<PurchaseStatus, HandlerOutcome> = {
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
    const read = await this.options.readCheckoutPurchase.execute({
      eventId,
      checkoutSessionId: session.id,
    });

    if (read.status !== "found") {
      return OUTCOME_BY_PURCHASE_STATUS[read.status];
    }

    const recorded = await this.recordPurchase(read.purchase);

    if (recorded.status === "already_paid") {
      return OUTCOME_BY_PURCHASE_STATUS[recorded.status];
    }

    const finished =
      await this.options.finishCheckoutPurchase.execute(recorded);

    await this.options.refreshPaymentCard.execute({
      paymentCustomerId: finished.paymentCustomerId,
    });

    return OUTCOME_BY_PURCHASE_STATUS[finished.status];
  }

  private async recordPurchase(
    purchase: CheckoutPurchase,
  ): Promise<PurchaseRecording> {
    try {
      return await this.options.unitOfWork(() =>
        this.options.recordCheckoutPurchase.execute(purchase),
      );
    } catch (error) {
      if (error instanceof CallAlreadyPaid) {
        return { status: "already_paid" };
      }

      throw error;
    }
  }
}
