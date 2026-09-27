import { joinBasePath } from "@eli-coach-platform/config";
import type {
  ClientInvitationMessage,
  ClientInvitationNotifications,
} from "@eli-coach-platform/domain/client-invitation";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { invitationPath } from "~/features/coaching-sales/contracts/paths";

import { createClientInvitationEmailContent } from "./client-invitation-email.server";

export type EmailClientInvitationNotificationsOptions = {
  appBasePath: string;
  clock: Clock;
  contactEmail: string;
  publicAppUrl: string;
};

export class EmailClientInvitationNotifications implements ClientInvitationNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailClientInvitationNotificationsOptions,
  ) {}

  async sendInvitation(
    message: ClientInvitationMessage,
  ): Promise<"sent" | "failed"> {
    const content = createClientInvitationEmailContent({
      acceptUrl: this.invitationUrl(message.rawToken),
      contactEmail: this.options.contactEmail,
      currentYear: this.options.clock.now().getUTCFullYear(),
      firstName: message.firstName,
    });
    const result = await this.productEmail.send({
      html: content.html,
      idempotencyKey: `client-invitation:${message.invitationId}`,
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
