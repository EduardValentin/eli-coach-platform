import {
  AssessmentCall,
  type AssessmentCallSnapshot,
} from "../assessment-call";
import type { PricingEligibility } from "../coaching-bundle";
import { EmailAddress } from "../email-address";
import type { Clock } from "../shared";

import type { AssessmentCallReader } from "./assessment-call-reader";
import type { CallSalesStates } from "./call-sales-states";
import type { CoachingSalesIncidents } from "./coaching-sales-incidents";
import type {
  CoachingSalesNotifications,
  PaymentLinkMessage,
} from "./coaching-sales-notifications";
import type { CoachingSalesWindow } from "./coaching-sales-window";
import { PaymentLink } from "./payment-link";
import type { PaymentLinks, PaymentLinkTokenGenerator } from "./payment-links";

type SendPaymentLinkResult =
  | { status: "sent"; email: string }
  | { status: "closed" }
  | { status: "call_not_found" }
  | { status: "call_not_ended" }
  | { status: "already_paid" }
  | { status: "delivery_failed" };

type SendPaymentLinkUseCaseOptions = {
  calls: AssessmentCallReader;
  callSalesStates: CallSalesStates;
  clock: Clock;
  incidents: CoachingSalesIncidents;
  notifications: CoachingSalesNotifications;
  paymentLinks: PaymentLinks;
  pricingEligibility: PricingEligibility;
  salesWindow: CoachingSalesWindow;
  tokenGenerator: PaymentLinkTokenGenerator;
};

export class SendPaymentLinkUseCase {
  constructor(private readonly options: SendPaymentLinkUseCaseOptions) {}

  async execute(command: {
    assessmentCallId: string;
  }): Promise<SendPaymentLinkResult> {
    if (!(await this.options.salesWindow.isOpen())) {
      return { status: "closed" };
    }

    const call = await this.options.calls.findById(command.assessmentCallId);

    if (!call) {
      return { status: "call_not_found" };
    }

    const now = this.options.clock.now();

    if (!AssessmentCall.reconstitute(call).hasEnded(now)) {
      return { status: "call_not_ended" };
    }

    const salesStates = await this.options.callSalesStates.forCalls([call.id]);

    if (salesStates.get(call.id) === "paid") {
      return { status: "already_paid" };
    }

    return this.issueAndSend(call, now);
  }

  private async issueAndSend(
    call: AssessmentCallSnapshot,
    now: Date,
  ): Promise<SendPaymentLinkResult> {
    const tier = await this.options.pricingEligibility.tierForEmail(
      EmailAddress.normalize(call.visitorEmail),
    );
    const token = this.options.tokenGenerator.create();
    const link = await this.options.paymentLinks.issue(
      PaymentLink.issue({
        assessmentCallId: call.id,
        tokenSha256: token.sha256,
        now,
      }),
    );

    const delivery = await this.deliver({
      call,
      paymentLinkId: link.id,
      rawToken: token.rawToken,
      tier,
    });

    if (delivery === "failed") {
      await this.options.paymentLinks.void(link.id);
      this.options.incidents.paymentLinkEmailFailed(call.id);

      return { status: "delivery_failed" };
    }

    await this.options.paymentLinks.voidOtherLinksOf(call.id, link.id);

    return { status: "sent", email: call.visitorEmail };
  }

  private async deliver(
    message: PaymentLinkMessage,
  ): Promise<"sent" | "failed"> {
    try {
      return await this.options.notifications.sendPaymentLink(message);
    } catch {
      return "failed";
    }
  }
}
