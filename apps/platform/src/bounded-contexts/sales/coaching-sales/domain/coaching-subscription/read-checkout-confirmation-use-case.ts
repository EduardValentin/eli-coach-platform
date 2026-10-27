import type { CoachingBundleId, PriceTier } from "../coaching-bundle";
import type { CoachingSalesWindow } from "../payment-link";

import { withdrawalDeadline, type StartChoice } from "./coaching-subscription";
import type { PaymentCheckout } from "./payment-checkout";

type CheckoutConfirmation =
  | {
      status: "paid";
      bundleId: CoachingBundleId;
      tier: PriceTier;
      amountCents: number;
      startChoice: StartChoice;
      paidAt: Date;
      email: string;
      waitingStartsOn: Date;
    }
  | { status: "closed" }
  | { status: "not_paid" };

type ReadCheckoutConfirmationUseCaseOptions = {
  paymentCheckout: PaymentCheckout;
  salesWindow: CoachingSalesWindow;
};

export class ReadCheckoutConfirmationUseCase {
  constructor(
    private readonly options: ReadCheckoutConfirmationUseCaseOptions,
  ) {}

  async execute(sessionId: string): Promise<CheckoutConfirmation> {
    if (!(await this.options.salesWindow.isOpen())) {
      return { status: "closed" };
    }

    const completion =
      await this.options.paymentCheckout.findCompletedSession(sessionId);

    if (!completion) {
      return { status: "not_paid" };
    }

    return {
      status: "paid",
      bundleId: completion.bundleId,
      tier: completion.tier,
      amountCents: completion.amountCents,
      startChoice: completion.startChoice,
      paidAt: completion.paidAt,
      email: completion.customerEmail,
      waitingStartsOn: withdrawalDeadline(completion.paidAt),
    };
  }
}
