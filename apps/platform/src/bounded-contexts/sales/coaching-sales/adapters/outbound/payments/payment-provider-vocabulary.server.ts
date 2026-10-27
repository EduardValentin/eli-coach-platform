import { z } from "zod";

export type PaymentSubscriptionStanding =
  "ended" | "payment-problem" | "healthy" | "other";

export type PaymentInvoiceReason = "purchase" | "renewal";

export type PaymentCardChangeKind = "attached" | "updated" | "detached";

export type PaymentProviderVocabulary = {
  standingOf: (status: string) => PaymentSubscriptionStanding;
  invoiceReasonOf: (billingReason: string | null) => PaymentInvoiceReason;
  cardChangeOf: (eventType: string) => PaymentCardChangeKind | null;
  isCardPaymentMethod: (paymentMethodType: string) => boolean;
};

export const referencedIdSchema = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1) }).transform((resource) => resource.id),
]);
