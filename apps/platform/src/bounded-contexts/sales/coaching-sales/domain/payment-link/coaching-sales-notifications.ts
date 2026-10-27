import type { PriceTier } from "../coaching-bundle";

import type { SalesCall } from "./ended-calls";

export type PaymentLinkMessage = {
  call: SalesCall;
  paymentLinkId: string;
  rawToken: string;
  tier: PriceTier;
};

export interface CoachingSalesNotifications {
  sendPaymentLink(message: PaymentLinkMessage): Promise<"sent" | "failed">;
}
