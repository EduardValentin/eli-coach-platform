import { joinBasePath } from "@eli-coach-platform/config";
import type { OnboardingDetailsNotifications } from "@eli-coach-platform/domain/client-onboarding";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";

import { createDetailsRequestEmailContent } from "./details-request-email.server";

type DetailsRequestMessage = Parameters<
  OnboardingDetailsNotifications["sendDetailsRequest"]
>[0];

export type EmailOnboardingDetailsNotificationsOptions = {
  appBasePath: string;
  clock: Clock;
  contactEmail: string;
  publicAppUrl: string;
};

export class EmailOnboardingDetailsNotifications implements OnboardingDetailsNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailOnboardingDetailsNotificationsOptions,
  ) {}

  async sendDetailsRequest(
    message: DetailsRequestMessage,
  ): Promise<"sent" | "failed"> {
    const content = createDetailsRequestEmailContent({
      contactEmail: this.options.contactEmail,
      currentYear: this.options.clock.now().getUTCFullYear(),
      firstName: message.firstName,
      portalUrl: this.clientPortalUrl(),
    });
    const result = await this.productEmail.send({
      html: content.html,
      idempotencyKey: `onboarding-details:${message.requestId}`,
      replyTo: this.options.contactEmail,
      subject: content.subject,
      text: content.text,
      to: message.email,
    });

    return result.kind === "sent" ? "sent" : "failed";
  }

  private clientPortalUrl(): string {
    return new URL(
      joinBasePath(this.options.appBasePath, CLIENT_PORTAL_PATH),
      this.options.publicAppUrl,
    ).toString();
  }
}
