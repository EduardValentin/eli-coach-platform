import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { PaymentCards } from "./payment-cards";
import type { PaymentCustomerCards } from "./payment-customer-cards";

type RefreshPaymentCardCommand = {
  paymentCustomerId: string;
};

type RefreshPaymentCardUseCaseOptions = {
  cards: PaymentCards;
  customerCards: PaymentCustomerCards;
  incidents: CoachingSubscriptionIncidents;
};

export class RefreshPaymentCardUseCase {
  constructor(private readonly options: RefreshPaymentCardUseCaseOptions) {}

  async execute(command: RefreshPaymentCardCommand): Promise<void> {
    const { paymentCustomerId } = command;

    try {
      const previous =
        await this.options.cards.findByPaymentCustomerId(paymentCustomerId);
      const card =
        await this.options.customerCards.readDefaultCard(paymentCustomerId);

      await this.options.cards.save({ paymentCustomerId, card, previous });
    } catch (error) {
      this.options.incidents.paymentCardRefreshFailed({
        paymentCustomerId,
        error,
      });

      throw error;
    }
  }
}
