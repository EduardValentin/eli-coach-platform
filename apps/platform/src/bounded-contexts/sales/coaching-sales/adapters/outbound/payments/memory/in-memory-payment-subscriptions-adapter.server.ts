import type { PaymentSubscriptionsPort } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";

export class InMemoryPaymentSubscriptionsAdapter implements PaymentSubscriptionsPort {
  async holdRenewal(): Promise<void> {}

  async liftRenewalHold(): Promise<void> {}

  async endNow(): Promise<void> {}

  async endAt(): Promise<void> {}

  async openPaymentMethodSession(command: {
    paymentCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    return { url: command.returnUrl };
  }
}
