import {
  PaymentCard,
  type MirrorPaymentCardUseCase,
  type PaymentCardEvent,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { PaymentCardChange } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import type { PaymentEventHandling } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-handlers.server";
import type { PaymentCardHandlerPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-card-handler-port.server";

type CoachingPaymentCardHandlerOptions = {
  mirrorPaymentCardUseCase: MirrorPaymentCardUseCase;
};

export class CoachingPaymentCardHandler implements PaymentCardHandlerPort {
  constructor(private readonly options: CoachingPaymentCardHandlerOptions) {}

  async handle(
    eventId: string,
    change: PaymentCardChange,
  ): Promise<PaymentEventHandling> {
    const mirrored = await this.options.mirrorPaymentCardUseCase.execute({
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
