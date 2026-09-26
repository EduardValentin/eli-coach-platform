import type { AssessmentCallSnapshot } from "../assessment-call";
import type { PriceTier } from "../coaching-bundle";

export type PaymentLinkMessage = {
  call: AssessmentCallSnapshot;
  paymentLinkId: string;
  rawToken: string;
  tier: PriceTier;
};

export interface CoachingSalesNotifications {
  sendPaymentLink(message: PaymentLinkMessage): Promise<"sent" | "failed">;
}
