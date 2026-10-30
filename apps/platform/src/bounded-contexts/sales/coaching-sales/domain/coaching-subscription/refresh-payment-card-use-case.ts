import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { PaymentCardsPort } from "./payment-cards-port";
import type { PaymentCustomerCardsPort } from "./payment-customer-cards-port";

type RefreshPaymentCardCommand = {
  paymentCustomerId: string;
};

type RefreshPaymentCardUseCaseOptions = {
  paymentCardsPort: PaymentCardsPort;
  paymentCustomerCardsPort: PaymentCustomerCardsPort;
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
};

export class RefreshPaymentCardUseCase {
  constructor(private readonly options: RefreshPaymentCardUseCaseOptions) {}

  async execute(command: RefreshPaymentCardCommand): Promise<void> {
    const { paymentCustomerId } = command;

    try {
      const previous =
        await this.options.paymentCardsPort.findByPaymentCustomerId(
          paymentCustomerId,
        );
      const card =
        await this.options.paymentCustomerCardsPort.readDefaultCard(
          paymentCustomerId,
        );

      await this.options.paymentCardsPort.save({
        paymentCustomerId,
        card,
        previous,
      });
    } catch (error) {
      this.options.coachingSubscriptionIncidentsPort.paymentCardRefreshFailed({
        paymentCustomerId,
        error,
      });

      throw error;
    }
  }
}
