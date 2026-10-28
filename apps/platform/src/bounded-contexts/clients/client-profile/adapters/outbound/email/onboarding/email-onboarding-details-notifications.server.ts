import { joinBasePath } from "~/shared/http/base-path";
import type { OnboardingDetailsNotifications } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { Clock } from "~/bounded-contexts/clients/client-profile/domain/clock";
import type { ProductEmail } from "~/shared/email/index.server";

import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";

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
