import type { PaymentCard } from "./payment-card";

export interface PaymentCustomerCardsPort {
  readDefaultCard(paymentCustomerId: string): Promise<PaymentCard | null>;
}
