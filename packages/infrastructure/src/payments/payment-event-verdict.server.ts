import { z } from "zod";

import {
  fromUnixSeconds,
  readPaidCheckoutSession,
  type PaidCheckoutSession,
} from "./checkout-session-completion.server";

export type PaymentEventVerdict =
  | {
      kind: "checkout_completed";
      eventId: string;
      session: PaidCheckoutSession;
    }
  | { kind: "ignored" }
  | { kind: "invalid" };

const CHECKOUT_COMPLETED_EVENT = "checkout.session.completed";

const paymentEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created: z.number().int().positive(),
  data: z.object({ object: z.unknown() }),
});

export function readPaymentEvent(event: unknown): PaymentEventVerdict {
  const parsed = paymentEventSchema.safeParse(event);

  if (!parsed.success) {
    return { kind: "invalid" };
  }

  if (parsed.data.type !== CHECKOUT_COMPLETED_EVENT) {
    return { kind: "ignored" };
  }

  const session = readPaidCheckoutSession(
    parsed.data.data.object,
    fromUnixSeconds(parsed.data.created),
  );

  if (!session) {
    return { kind: "ignored" };
  }

  return { kind: "checkout_completed", eventId: parsed.data.id, session };
}
