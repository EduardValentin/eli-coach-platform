import type { PaymentSubscriptions } from "@eli-coach-platform/domain/coaching-subscription";

export class InMemoryPaymentSubscriptions implements PaymentSubscriptions {
  async holdRenewal(): Promise<void> {}

  async endNow(): Promise<void> {}

  async endAt(): Promise<void> {}

  async openPaymentMethodSession(command: {
    paymentCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    return { url: command.returnUrl };
  }
}
