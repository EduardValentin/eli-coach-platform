import type { PriceTier, PricingEligibilityPort } from "../coaching-bundle";
import type { EmailAcceptancePort } from "../email-acceptance-port";
import type { ClockPort } from "../clock-port";

import type { CallSalesStatesPort } from "./call-sales-states-port";
import type { CoachingSalesWindow } from "./coaching-sales-window";
import type { EndedCallsPort, SalesCall } from "./ended-calls-port";
import { PaymentLink } from "./payment-link";
import type { PaymentLinksPort } from "./payment-links-port";
import type { PaymentLinkTokenHasherPort } from "./payment-link-token-hasher-port";

type PaymentLinkResolution =
  | {
      status: "valid";
      link: PaymentLink;
      call: SalesCall;
      tier: PriceTier;
    }
  | { status: "closed" }
  | { status: "invalid" };

type ResolvePaymentLinkUseCaseOptions = {
  calls: EndedCallsPort;
  callSalesStates: CallSalesStatesPort;
  clock: ClockPort;
  emailAcceptance: EmailAcceptancePort;
  paymentLinks: PaymentLinksPort;
  pricingEligibility: PricingEligibilityPort;
  salesWindow: CoachingSalesWindow;
  tokenHasher: PaymentLinkTokenHasherPort;
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

    if (salesStates.get(call.id)?.state === "paid") {
      return { status: "invalid" };
    }

    const tier = await this.options.pricingEligibility.tierForEmail(
      this.options.emailAcceptance.normalize(call.visitorEmail),
    );

    return { status: "valid", link, call, tier };
  }
}
