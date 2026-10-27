import type { PaymentCard } from "./payment-card";

export interface PaymentCustomerCards {
  readDefaultCard(paymentCustomerId: string): Promise<PaymentCard | null>;
}
