export interface PaymentSubscriptionsPort {
  holdRenewal(command: {
    paymentSubscriptionId: string;
    until: Date;
  }): Promise<void>;
  liftRenewalHold(paymentSubscriptionId: string): Promise<void>;
  endNow(paymentSubscriptionId: string): Promise<void>;
  endAt(command: { paymentSubscriptionId: string; at: Date }): Promise<void>;
  openPaymentMethodSession(command: {
    paymentCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
}
