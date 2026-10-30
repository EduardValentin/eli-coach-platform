import { joinBasePath } from "~/shared/http/base-path";
import type {
  RefundDueNotice,
  RefundNotificationsPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { ClockPort } from "~/bounded-contexts/sales/coaching-sales/domain/clock-port";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { coachClientPath } from "~/bounded-contexts/clients/public/paths";

import { createRefundDueEmailContent } from "./refund-due-email.server";

export type EmailRefundNotificationsOptions = {
  appBasePath: string;
  clockPort: ClockPort;
  coachEmail: string;
  publicAppUrl: string;
};

export class EmailRefundNotificationsAdapter implements RefundNotificationsPort {
  constructor(
    private readonly productEmailPort: ProductEmailPort,
    private readonly options: EmailRefundNotificationsOptions,
  ) {}

  async notifyRefundDue(notice: RefundDueNotice): Promise<"sent" | "failed"> {
    const content = createRefundDueEmailContent({
      notice,
      clientPageUrl: new URL(
        joinBasePath(
          this.options.appBasePath,
          coachClientPath(notice.client.clientId),
        ),
        this.options.publicAppUrl,
      ).toString(),
      currentYear: this.options.clockPort.now().getUTCFullYear(),
    });
    const result = await this.productEmailPort.send({
      html: content.html,
      idempotencyKey: `refund-due:${notice.subscriptionId}`,
      replyTo: notice.client.email,
      subject: content.subject,
      text: content.text,
      to: this.options.coachEmail,
    });

    return result.kind === "rejected" ? "failed" : "sent";
  }
}
