import type { AssessmentCallSnapshot } from "../assessment-call";
import type { PriceTier, PricingEligibility } from "../coaching-bundle";
import { EmailAddress } from "../email-address";
import type { Clock } from "../shared";

import type { AssessmentCallReader } from "./assessment-call-reader";
import type { CallSalesStates } from "./call-sales-states";
import type { CoachingSalesWindow } from "./coaching-sales-window";
import { PaymentLink } from "./payment-link";
import type { PaymentLinks, PaymentLinkTokenHasher } from "./payment-links";

type PaymentLinkResolution =
  | {
      status: "valid";
      link: PaymentLink;
      call: AssessmentCallSnapshot;
      tier: PriceTier;
    }
  | { status: "closed" }
  | { status: "invalid" };

type ResolvePaymentLinkUseCaseOptions = {
  calls: AssessmentCallReader;
  callSalesStates: CallSalesStates;
  clock: Clock;
  paymentLinks: PaymentLinks;
  pricingEligibility: PricingEligibility;
  salesWindow: CoachingSalesWindow;
  tokenHasher: PaymentLinkTokenHasher;
};

export class ResolvePaymentLinkUseCase {
  constructor(private readonly options: ResolvePaymentLinkUseCaseOptions) {}

  async execute(rawToken: string): Promise<PaymentLinkResolution> {
    if (!(await this.options.salesWindow.isOpen())) {
      return { status: "closed" };
    }

    if (!PaymentLink.isPlausibleToken(rawToken)) {
      return { status: "invalid" };
    }

    const link = await this.options.paymentLinks.findByTokenSha256(
      this.options.tokenHasher.sha256(rawToken),
    );

    if (!link || !link.isUsable(this.options.clock.now())) {
      return { status: "invalid" };
    }

    const call = await this.options.calls.findById(link.assessmentCallId);

    if (!call) {
      return { status: "invalid" };
    }

    const salesStates = await this.options.callSalesStates.forCalls([call.id]);

    if (salesStates.get(call.id) === "paid") {
      return { status: "invalid" };
    }

    const tier = await this.options.pricingEligibility.tierForEmail(
      EmailAddress.normalize(call.visitorEmail),
    );

    return { status: "valid", link, call, tier };
  }
}
