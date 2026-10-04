import type { PaymentCard } from "./payment-card";

export type CardOnFileChange = {
  paymentCustomerId: string;
  card: PaymentCard | null;
  previous: PaymentCard | null;
};

export type CardOnFileEventChange = CardOnFileChange & { eventId: string };

export interface PaymentCards {
  findByPaymentCustomerId(
    paymentCustomerId: string,
  ): Promise<PaymentCard | null>;
  save(change: CardOnFileChange): Promise<"saved" | "stale">;
  saveForEvent(
    change: CardOnFileEventChange,
  ): Promise<"recorded" | "duplicate" | "stale">;
}
