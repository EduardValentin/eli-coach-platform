export type SubscriptionEvent =
  | {
      kind: "end-scheduled";
      paymentSubscriptionId: string;
      endsAt: Date;
      occurredAt: Date;
    }
  | { kind: "end-lifted"; paymentSubscriptionId: string; occurredAt: Date }
  | { kind: "ended"; paymentSubscriptionId: string; endedAt: Date }
  | { kind: "payment-problem"; paymentSubscriptionId: string; occurredAt: Date }
  | {
      kind: "payment-recovered";
      paymentSubscriptionId: string;
      occurredAt: Date;
    }
  | { kind: "renewal-paid"; paymentSubscriptionId: string; occurredAt: Date }
  | {
      kind: "charge-refunded";
      paymentIntentId: string;
      refundedCents: number;
      occurredAt: Date;
    };

export type SubscriptionEventKind = SubscriptionEvent["kind"];
