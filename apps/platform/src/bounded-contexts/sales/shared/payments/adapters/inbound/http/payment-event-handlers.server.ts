export type PaymentEventHandling = "recorded" | "duplicate" | "ignored";

export type PaymentRefundHandling = PaymentEventHandling | "unowned";
