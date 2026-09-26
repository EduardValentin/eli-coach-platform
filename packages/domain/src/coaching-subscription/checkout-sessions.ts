import type { CoachingBundleId, PriceTier } from "../coaching-bundle";

import type { StartChoice } from "./coaching-subscription";

export type CheckoutSessionRecord = {
  id: string;
  paymentLinkId: string;
  bundleId: CoachingBundleId;
  tier: PriceTier;
  amountCents: number;
  currency: string;
  startChoice: StartChoice;
  createdAt: Date;
};

export interface CheckoutSessions {
  remember(session: CheckoutSessionRecord): Promise<void>;
  findOpenForCall(assessmentCallId: string): Promise<readonly { id: string }[]>;
  markExpired(id: string): Promise<void>;
}
