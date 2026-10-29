import { joinBasePath } from "~/shared/http/base-path";
import type {
  AccountInvitationMessage,
  AccountInvitationNotifications,
} from "~/bounded-contexts/access/accounts/domain/account";
import type { Clock } from "~/bounded-contexts/access/accounts/domain/clock";
import type { ProductEmail } from "~/shared/email/index.server";

import { invitationPath } from "~/bounded-contexts/access/public/paths";

import { createAccountInvitationEmailContent } from "./account-invitation-email.server";

export type EmailAccountInvitationNotificationsOptions = {
  appBasePath: string;
  clock: Clock;
  contactEmail: string;
  publicAppUrl: string;
};

export class EmailAccountInvitationNotifications implements AccountInvitationNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailAccountInvitationNotificationsOptions,
  ) {}

  async sendInvitation(
    message: AccountInvitationMessage,
  ): Promise<"sent" | "failed"> {
    const content = createAccountInvitationEmailContent({
      acceptUrl: this.invitationUrl(message.rawToken),
      contactEmail: this.options.contactEmail,
      currentYear: this.options.clock.now().getUTCFullYear(),
      firstName: message.firstName,
    });
    const result = await this.productEmail.send({
      html: content.html,
      idempotencyKey: `client-invitation:${message.invitationId}:${message.sentAt.toISOString()}`,
      replyTo: this.options.contactEmail,
      subject: content.subject,
      text: content.text,
      to: message.email,
    });

    return result.kind === "sent" ? "sent" : "failed";
  }

  private invitationUrl(rawToken: string): string {
    return new URL(
      joinBasePath(
        this.options.appBasePath,
        invitationPath({ token: rawToken }),
      ),
      this.options.publicAppUrl,
    ).toString();
  }
}
