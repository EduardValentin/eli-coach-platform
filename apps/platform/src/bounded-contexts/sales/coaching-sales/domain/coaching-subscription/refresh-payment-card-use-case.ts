import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { PaymentCardsPort } from "./payment-cards-port";
import type { PaymentCustomerCardsPort } from "./payment-customer-cards-port";

type RefreshPaymentCardCommand = {
  paymentCustomerId: string;
};

type RefreshPaymentCardUseCaseOptions = {
  cards: PaymentCardsPort;
  customerCards: PaymentCustomerCardsPort;
  incidents: CoachingSubscriptionIncidentsPort;
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
