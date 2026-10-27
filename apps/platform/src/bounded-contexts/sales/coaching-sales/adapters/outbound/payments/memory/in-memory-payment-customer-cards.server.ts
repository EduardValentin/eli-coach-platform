import {
  PaymentCard,
  type PaymentCustomerCards,
} from "@eli-coach-platform/domain/coaching-subscription";

const TEST_CARD = PaymentCard.of({
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
  paymentMethodId: "pm_memory_card",
});

export class InMemoryPaymentCustomerCards implements PaymentCustomerCards {
  async readDefaultCard(): Promise<PaymentCard | null> {
    return TEST_CARD;
  }
}
