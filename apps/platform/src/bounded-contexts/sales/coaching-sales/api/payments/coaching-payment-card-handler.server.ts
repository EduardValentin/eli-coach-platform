import {
  PaymentCard,
  type MirrorPaymentCardUseCase,
  type PaymentCardEvent,
} from "@eli-coach-platform/domain/coaching-subscription";
import type {
  PaymentCardChange,
  PaymentCardHandler,
  PaymentEventHandling,
} from "@eli-coach-platform/infrastructure/payments/server";

type CoachingPaymentCardHandlerOptions = {
  mirrorPaymentCard: MirrorPaymentCardUseCase;
};

export class CoachingPaymentCardHandler implements PaymentCardHandler {
  constructor(private readonly options: CoachingPaymentCardHandlerOptions) {}

  async handle(
    eventId: string,
    change: PaymentCardChange,
  ): Promise<PaymentEventHandling> {
    const mirrored = await this.options.mirrorPaymentCard.execute({
      eventId,
      event: toPaymentCardEvent(change),
    });

    return mirrored.status;
  }
}

function toPaymentCardEvent(change: PaymentCardChange): PaymentCardEvent {
  const paymentCustomerId = change.customerId;

  switch (change.kind) {
    case "attached":
      return { kind: "card-attached", paymentCustomerId, card: cardOf(change) };
    case "updated":
      return { kind: "card-updated", paymentCustomerId, card: cardOf(change) };
    case "detached":
      return {
        kind: "card-detached",
        paymentCustomerId,
        paymentMethodId: change.paymentMethodId,
      };
  }
}

function cardOf(change: PaymentCardChange): PaymentCard {
  return PaymentCard.of({
    brand: change.brand,
    lastFour: change.lastFour,
    expiryMonth: change.expiryMonth,
    expiryYear: change.expiryYear,
    paymentMethodId: change.paymentMethodId,
  });
}
