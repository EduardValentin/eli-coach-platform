import {
  findCoachingBundle,
  type PricingEligibilityPort,
} from "../coaching-bundle";
import type { EmailAcceptancePort } from "../email-acceptance-port";
import {
  PaymentLink,
  type CallSalesStatesPort,
  type CoachingSalesWindow,
  type EndedCallsPort,
  type PaymentLinksPort,
  type PaymentLinkTokenHasherPort,
  type SalesCall,
} from "../payment-link";
import type { ClockPort } from "../clock-port";

import type { CheckoutSessionsPort } from "./checkout-sessions-port";
import {
  COACHING_SUBSCRIPTION_PURPOSE,
  type StartChoice,
} from "./coaching-subscription";
import type { PaymentCheckoutPort } from "./payment-checkout-port";

type StartCheckoutCommand = {
  rawToken: string;
  bundleId: string;
  startChoice: StartChoice;
  successUrl: string;
  cancelUrl: string;
};

type StartCheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "closed" }
  | { status: "invalid_link" }
  | { status: "unknown_bundle" };

type StartCheckoutUseCaseOptions = {
  endedCallsPort: EndedCallsPort;
  callSalesStatesPort: CallSalesStatesPort;
  checkoutSessionsPort: CheckoutSessionsPort;
  clockPort: ClockPort;
  emailAcceptancePort: EmailAcceptancePort;
  paymentCheckoutPort: PaymentCheckoutPort;
  paymentLinksPort: PaymentLinksPort;
  pricingEligibilityPort: PricingEligibilityPort;
  salesWindow: CoachingSalesWindow;
  paymentLinkTokenHasherPort: PaymentLinkTokenHasherPort;
};

type SessionsClearingOutcome = "cleared" | "already_paid";

type SessionExpiryOutcome = "expired" | "already_paid";

export class StartCheckoutUseCase {
  constructor(private readonly options: StartCheckoutUseCaseOptions) {}

  async execute(command: StartCheckoutCommand): Promise<StartCheckoutResult> {
    if (!(await this.options.salesWindow.isOpen())) {
      return { status: "closed" };
    }

    const now = this.options.clockPort.now();
    const link = await this.findUsableLink(command.rawToken, now);

    if (!link) {
      return { status: "invalid_link" };
    }

    const bundle = findCoachingBundle(command.bundleId);

    if (!bundle) {
      return { status: "unknown_bundle" };
    }

    const call = await this.options.endedCallsPort.findById(
      link.assessmentCallId,
    );

    if (!call) {
      return { status: "invalid_link" };
    }

    const salesStates = await this.options.callSalesStatesPort.forCalls([
      call.id,
    ]);

    if (salesStates.get(call.id)?.state === "paid") {
      return { status: "invalid_link" };
    }

    const tier = await this.options.pricingEligibilityPort.tierForEmail(
      this.options.emailAcceptancePort.normalize(call.visitorEmail),
    );
    const customerId = await this.paymentCustomerFor(call, link.id);

    const sessionsClearing = await this.expireOpenSessionsOf(call.id);

    if (sessionsClearing === "already_paid") {
      return { status: "invalid_link" };
    }

    const amountCents = bundle.totalCents(tier);
    const session = await this.options.paymentCheckoutPort.createSession({
      customerId,
      bundle: {
        id: bundle.id,
        title: bundle.title,
        months: bundle.months,
        amountCents,
      },
      currency: bundle.currency,
      metadata: {
        purpose: COACHING_SUBSCRIPTION_PURPOSE,
        assessmentCallId: call.id,
        bundleId: bundle.id,
        tier,
        startChoice: command.startChoice,
      },
      successUrl: command.successUrl,
      cancelUrl: command.cancelUrl,
    });

    await this.options.checkoutSessionsPort.remember({
      id: session.id,
      paymentLinkId: link.id,
      bundleId: bundle.id,
      tier,
      amountCents,
      currency: bundle.currency,
      startChoice: command.startChoice,
      createdAt: now,
    });

    return { status: "redirect", url: session.url };
  }

  private async findUsableLink(
    rawToken: string,
    now: Date,
  ): Promise<PaymentLink | null> {
    if (!PaymentLink.isPlausibleToken(rawToken)) {
      return null;
    }

    const link = await this.options.paymentLinksPort.findByTokenSha256(
      this.options.paymentLinkTokenHasherPort.sha256(rawToken),
    );

    return link?.isUsable(now) ? link : null;
  }

  private async paymentCustomerFor(
    call: SalesCall,
    paymentLinkId: string,
  ): Promise<string> {
    const existing =
      await this.options.paymentLinksPort.findPaymentCustomerForCall(call.id);

    if (existing) {
      return existing;
    }

    const customer = await this.options.paymentCheckoutPort.createCustomer({
      email: call.visitorEmail,
      assessmentCallId: call.id,
    });

    await this.options.paymentLinksPort.rememberPaymentCustomer(
      paymentLinkId,
      customer.id,
    );

    return customer.id;
  }

  private async expireOpenSessionsOf(
    assessmentCallId: string,
  ): Promise<SessionsClearingOutcome> {
    const openSessions =
      await this.options.checkoutSessionsPort.findOpenForCall(assessmentCallId);
    const outcomes: SessionExpiryOutcome[] = [];

    for (const session of openSessions) {
      outcomes.push(await this.expireOpenSession(session.id));
    }

    return outcomes.includes("already_paid") ? "already_paid" : "cleared";
  }

  private async expireOpenSession(
    sessionId: string,
  ): Promise<SessionExpiryOutcome> {
    await this.options.paymentCheckoutPort.expireSession(sessionId);

    if (
      await this.options.paymentCheckoutPort.findCompletedSession(sessionId)
    ) {
      return "already_paid";
    }

    await this.options.checkoutSessionsPort.markExpired(sessionId);

    return "expired";
  }
}
