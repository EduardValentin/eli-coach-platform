import type { PricingEligibilityPort } from "../coaching-bundle";
import type { EmailAcceptancePort } from "../email-acceptance-port";
import type { ClockPort } from "../clock-port";

import type { CallSalesStatesPort } from "./call-sales-states-port";
import type { CoachingSalesIncidentsPort } from "./coaching-sales-incidents-port";
import type {
  CoachingSalesNotificationsPort,
  PaymentLinkMessage,
} from "./coaching-sales-notifications-port";
import type { CoachingSalesWindow } from "./coaching-sales-window";
import type { EndedCallsPort, SalesCall } from "./ended-calls-port";
import { PaymentLink } from "./payment-link";
import type { PaymentLinkIdsPort } from "./payment-link-ids-port";
import type { PaymentLinksPort } from "./payment-links-port";
import type { PaymentLinkTokenGeneratorPort } from "./payment-link-token-generator-port";

type SendPaymentLinkResult =
  | { status: "sent"; email: string }
  | { status: "closed" }
  | { status: "call_not_found" }
  | { status: "call_not_ended" }
  | { status: "already_paid" }
  | { status: "delivery_failed" };

type SendPaymentLinkUseCaseOptions = {
  endedCallsPort: EndedCallsPort;
  callSalesStatesPort: CallSalesStatesPort;
  clockPort: ClockPort;
  emailAcceptancePort: EmailAcceptancePort;
  paymentLinkIdsPort: PaymentLinkIdsPort;
  coachingSalesIncidentsPort: CoachingSalesIncidentsPort;
  coachingSalesNotificationsPort: CoachingSalesNotificationsPort;
  paymentLinksPort: PaymentLinksPort;
  pricingEligibilityPort: PricingEligibilityPort;
  salesWindow: CoachingSalesWindow;
  paymentLinkTokenGeneratorPort: PaymentLinkTokenGeneratorPort;
};

export class SendPaymentLinkUseCase {
  constructor(private readonly options: SendPaymentLinkUseCaseOptions) {}

  async execute(command: {
    assessmentCallId: string;
  }): Promise<SendPaymentLinkResult> {
    if (!(await this.options.salesWindow.isOpen())) {
      return { status: "closed" };
    }

    const call = await this.options.endedCallsPort.findById(
      command.assessmentCallId,
    );

    if (!call) {
      return { status: "call_not_found" };
    }

    const now = this.options.clockPort.now();

    if (call.endsAt > now) {
      return { status: "call_not_ended" };
    }

    const salesStates = await this.options.callSalesStatesPort.forCalls([
      call.id,
    ]);

    if (salesStates.get(call.id)?.state === "paid") {
      return { status: "already_paid" };
    }

    return this.issueAndSend(call, now);
  }

  private async issueAndSend(
    call: SalesCall,
    now: Date,
  ): Promise<SendPaymentLinkResult> {
    const tier = await this.options.pricingEligibilityPort.tierForEmail(
      this.options.emailAcceptancePort.normalize(call.visitorEmail),
    );
    const token = this.options.paymentLinkTokenGeneratorPort.create();
    const link = PaymentLink.issued({
      id: this.options.paymentLinkIdsPort.generate(),
      assessmentCallId: call.id,
      tokenSha256: token.sha256,
      at: now,
    });

    await this.options.paymentLinksPort.issue(link);

    const delivery = await this.deliver({
      call,
      paymentLinkId: link.id,
      rawToken: token.rawToken,
      tier,
    });

    if (delivery === "failed") {
      await this.options.paymentLinksPort.void(link.id);
      this.options.coachingSalesIncidentsPort.paymentLinkEmailFailed(call.id);

      return { status: "delivery_failed" };
    }

    await this.options.paymentLinksPort.voidOtherLinksOf(call.id, link.id);

    return { status: "sent", email: call.visitorEmail };
  }

  private async deliver(
    message: PaymentLinkMessage,
  ): Promise<"sent" | "failed"> {
    try {
      return await this.options.coachingSalesNotificationsPort.sendPaymentLink(
        message,
      );
    } catch {
      return "failed";
    }
  }
}
