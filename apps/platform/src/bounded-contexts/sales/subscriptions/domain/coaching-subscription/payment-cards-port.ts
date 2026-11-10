import type { PaymentCard } from "./payment-card";

export type PaymentCardWrite = {
  paymentCustomerId: string;
  card: PaymentCard | null;
  previous: PaymentCard | null;
};

export type PaymentCardEventWrite = PaymentCardWrite & { eventId: string };

export interface PaymentCardsPort {
  findByPaymentCustomerId(
    paymentCustomerId: string,
  ): Promise<PaymentCard | null>;
  save(change: PaymentCardWrite): Promise<"saved" | "stale">;
  saveForEvent(
    change: PaymentCardEventWrite,
  ): Promise<"recorded" | "duplicate" | "stale">;
}
