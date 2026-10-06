import { joinBasePath } from "@eli-coach-platform/config";
import type {
  RefundDueNotice,
  RefundNotifications,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { coachClientPath } from "~/features/coaching-sales/contracts/paths";

import { createRefundDueEmailContent } from "./refund-due-email.server";

export type EmailRefundNotificationsOptions = {
  appBasePath: string;
  clock: Clock;
  coachEmail: string;
  publicAppUrl: string;
};

export class EmailRefundNotifications implements RefundNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
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
      currentYear: this.options.clock.now().getUTCFullYear(),
    });
    const result = await this.productEmail.send({
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
