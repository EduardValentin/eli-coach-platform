import type { PriceTier } from "../coaching-bundle";

import type { SalesCall } from "./ended-calls-port";

export type PaymentLinkMessage = {
  call: SalesCall;
  paymentLinkId: string;
  rawToken: string;
  tier: PriceTier;
};

export interface CoachingSalesNotificationsPort {
  sendPaymentLink(message: PaymentLinkMessage): Promise<"sent" | "failed">;
}
