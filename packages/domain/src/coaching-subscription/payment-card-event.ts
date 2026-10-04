import type { PaymentCard } from "./payment-card";

export type PaymentCardEvent =
  | { kind: "card-attached"; paymentCustomerId: string; card: PaymentCard }
  | { kind: "card-updated"; paymentCustomerId: string; card: PaymentCard }
  | {
      kind: "card-detached";
      paymentCustomerId: string;
      paymentMethodId: string;
    };

export type PaymentCardEventKind = PaymentCardEvent["kind"];
