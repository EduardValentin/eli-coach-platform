import { z } from "zod";

export type PaymentSubscriptionStanding =
  "ended" | "payment-problem" | "healthy" | "other";

export type PaymentInvoiceReason = "purchase" | "renewal";

export type PaymentCardChangeKind = "attached" | "updated" | "detached";

export const referencedIdSchema = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1) }).transform((resource) => resource.id),
]);
