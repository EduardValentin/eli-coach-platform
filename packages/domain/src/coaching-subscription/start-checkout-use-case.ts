import type { AssessmentCallSnapshot } from "../assessment-call";
import {
  findCoachingBundle,
  type PricingEligibility,
} from "../coaching-bundle";
import { EmailAddress } from "../email-address";
import {
  PaymentLink,
  type AssessmentCallReader,
  type CallSalesStates,
  type CoachingSalesWindow,
  type PaymentLinks,
  type PaymentLinkTokenHasher,
} from "../payment-link";
import type { Clock } from "../shared";

import type { CheckoutSessions } from "./checkout-sessions";
import type { StartChoice } from "./coaching-subscription";
import type { PaymentCheckout } from "./payment-checkout";

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
  calls: AssessmentCallReader;
  callSalesStates: CallSalesStates;
  checkoutSessions: CheckoutSessions;
  clock: Clock;
  paymentCheckout: PaymentCheckout;
  paymentLinks: PaymentLinks;
  pricingEligibility: PricingEligibility;
  salesWindow: CoachingSalesWindow;
  tokenHasher: PaymentLinkTokenHasher;
};

type SessionsClearingOutcome = "cleared" | "already_paid";

type SessionExpiryOutcome = "expired" | "already_paid";

const COACHING_CURRENCY = "eur";

export class StartCheckoutUseCase {
  constructor(private readonly options: StartCheckoutUseCaseOptions) {}

  async execute(command: StartCheckoutCommand): Promise<StartCheckoutResult> {
    if (!(await this.options.salesWindow.isOpen())) {
      return { status: "closed" };
    }

    const now = this.options.clock.now();
    const link = await this.findUsableLink(command.rawToken, now);

    if (!link) {
      return { status: "invalid_link" };
    }

    const bundle = findCoachingBundle(command.bundleId);

    if (!bundle) {
      return { status: "unknown_bundle" };
    }

    const call = await this.options.calls.findById(link.assessmentCallId);

    if (!call) {
      return { status: "invalid_link" };
    }

    const salesStates = await this.options.callSalesStates.forCalls([call.id]);

    if (salesStates.get(call.id) === "paid") {
      return { status: "invalid_link" };
    }

    const tier = await this.options.pricingEligibility.tierForEmail(
      EmailAddress.normalize(call.visitorEmail),
    );
    const customerId = await this.paymentCustomerFor(call, link.id);

    const sessionsClearing = await this.expireOpenSessionsOf(call.id);

    if (sessionsClearing === "already_paid") {
      return { status: "invalid_link" };
    }

    const amountCents = bundle.totalCents(tier);
    const session = await this.options.paymentCheckout.createSession({
      customerId,
      bundle: {
        id: bundle.id,
        title: bundle.title,
        months: bundle.months,
        amountCents,
      },
      currency: COACHING_CURRENCY,
      metadata: {
        assessmentCallId: call.id,
        bundleId: bundle.id,
        tier,
        startChoice: command.startChoice,
      },
      successUrl: command.successUrl,
      cancelUrl: command.cancelUrl,
    });

    await this.options.checkoutSessions.remember({
      id: session.id,
      paymentLinkId: link.id,
      bundleId: bundle.id,
      tier,
      amountCents,
      currency: COACHING_CURRENCY,
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

    const link = await this.options.paymentLinks.findByTokenSha256(
      this.options.tokenHasher.sha256(rawToken),
    );

    return link?.isUsable(now) ? link : null;
  }

  private async paymentCustomerFor(
    call: AssessmentCallSnapshot,
    paymentLinkId: string,
  ): Promise<string> {
    const existing = await this.options.paymentLinks.findPaymentCustomerForCall(
      call.id,
    );

    if (existing) {
      return existing;
    }

    const customer = await this.options.paymentCheckout.createCustomer({
      email: call.visitorEmail,
      assessmentCallId: call.id,
    });

    await this.options.paymentLinks.rememberPaymentCustomer(
      paymentLinkId,
      customer.id,
    );

    return customer.id;
  }

  private async expireOpenSessionsOf(
    assessmentCallId: string,
  ): Promise<SessionsClearingOutcome> {
    const openSessions =
      await this.options.checkoutSessions.findOpenForCall(assessmentCallId);
    const outcomes: SessionExpiryOutcome[] = [];

    for (const session of openSessions) {
      outcomes.push(await this.expireOpenSession(session.id));
    }

    return outcomes.includes("already_paid") ? "already_paid" : "cleared";
  }

  private async expireOpenSession(
    sessionId: string,
  ): Promise<SessionExpiryOutcome> {
    await this.options.paymentCheckout.expireSession(sessionId);

    if (await this.options.paymentCheckout.findCompletedSession(sessionId)) {
      return "already_paid";
    }

    await this.options.checkoutSessions.markExpired(sessionId);

    return "expired";
  }
}
