import { joinBasePath } from "~/shared/http/base-path";
import type { OnboardingDetailsNotificationsPort } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { ClockPort } from "~/bounded-contexts/clients/client-profile/domain/clock-port";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { CLIENT_PORTAL_PATH } from "~/bounded-contexts/access/public/paths";

import { createDetailsRequestEmailContent } from "./details-request-email.server";

type DetailsRequestMessage = Parameters<
  OnboardingDetailsNotificationsPort["sendDetailsRequest"]
>[0];

export type EmailOnboardingDetailsNotificationsOptions = {
  appBasePath: string;
  clockPort: ClockPort;
  contactEmail: string;
  publicAppUrl: string;
};

export class EmailOnboardingDetailsNotificationsAdapter implements OnboardingDetailsNotificationsPort {
  constructor(
    private readonly productEmailPort: ProductEmailPort,
    private readonly options: EmailOnboardingDetailsNotificationsOptions,
  ) {}

  async sendDetailsRequest(
    message: DetailsRequestMessage,
  ): Promise<"sent" | "failed"> {
    const content = createDetailsRequestEmailContent({
      contactEmail: this.options.contactEmail,
      currentYear: this.options.clockPort.now().getUTCFullYear(),
      firstName: message.firstName,
      portalUrl: this.clientPortalUrl(),
    });
    const result = await this.productEmailPort.send({
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
