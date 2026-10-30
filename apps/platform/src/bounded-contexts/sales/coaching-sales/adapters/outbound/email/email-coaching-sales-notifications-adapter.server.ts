import { joinBasePath } from "~/shared/http/base-path";
import type { ClockPort } from "~/bounded-contexts/sales/coaching-sales/domain/clock-port";
import type {
  CoachingSalesNotificationsPort,
  PaymentLinkMessage,
} from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { selectBundlePath } from "~/bounded-contexts/sales/coaching-sales/public/paths";

import { createPaymentLinkEmailContent } from "./payment-link-email.server";

export type EmailCoachingSalesNotificationsOptions = {
  appBasePath: string;
  clockPort: ClockPort;
  contactEmail: string;
  publicAppUrl: string;
};

const TERMS_PATH = "/terms";

export class EmailCoachingSalesNotificationsAdapter implements CoachingSalesNotificationsPort {
  constructor(
    private readonly productEmailPort: ProductEmailPort,
    private readonly options: EmailCoachingSalesNotificationsOptions,
  ) {}

  async sendPaymentLink(
    message: PaymentLinkMessage,
  ): Promise<"sent" | "failed"> {
    const content = createPaymentLinkEmailContent({
      chooseUrl: this.buildUrl(selectBundlePath({ token: message.rawToken })),
      contactEmail: this.options.contactEmail,
      currentYear: this.options.clockPort.now().getUTCFullYear(),
      firstName: message.call.firstName,
      termsUrl: this.buildUrl(TERMS_PATH),
      tier: message.tier,
    });
    const result = await this.productEmailPort.send({
      html: content.html,
      idempotencyKey: `payment-link:${message.paymentLinkId}`,
      replyTo: this.options.contactEmail,
      subject: content.subject,
      text: content.text,
      to: message.call.visitorEmail,
    });

    return result.kind === "rejected" ? "failed" : "sent";
  }

  private buildUrl(path: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, path),
      this.options.publicAppUrl,
    ).toString();
  }
}
