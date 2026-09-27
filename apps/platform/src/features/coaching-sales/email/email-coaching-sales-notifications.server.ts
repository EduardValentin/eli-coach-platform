import { joinBasePath } from "@eli-coach-platform/config";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type {
  CoachingSalesNotifications,
  PaymentLinkMessage,
} from "@eli-coach-platform/domain/payment-link";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { selectBundlePath } from "~/features/coaching-sales/contracts/paths";

import { createPaymentLinkEmailContent } from "./payment-link-email.server";

export type EmailCoachingSalesNotificationsOptions = {
  appBasePath: string;
  clock: Clock;
  contactEmail: string;
  publicAppUrl: string;
};

const TERMS_PATH = "/terms";

export class EmailCoachingSalesNotifications implements CoachingSalesNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailCoachingSalesNotificationsOptions,
  ) {}

  async sendPaymentLink(
    message: PaymentLinkMessage,
  ): Promise<"sent" | "failed"> {
    const content = createPaymentLinkEmailContent({
      chooseUrl: this.buildUrl(selectBundlePath({ token: message.rawToken })),
      contactEmail: this.options.contactEmail,
      currentYear: this.options.clock.now().getUTCFullYear(),
      firstName: message.call.firstName,
      termsUrl: this.buildUrl(TERMS_PATH),
      tier: message.tier,
    });
    const result = await this.productEmail.send({
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
