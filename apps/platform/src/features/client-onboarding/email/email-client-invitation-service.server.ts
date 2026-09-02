import type {
  ClientInvitationService,
  SendClientInvitationCommand,
} from "@eli-coach-platform/domain";
import type { ProductEmailSender } from "@eli-coach-platform/infrastructure/email/server";

import { createClientInvitationEmailContent } from "./client-invitation-email.server";

type EmailClientInvitationServiceOptions = {
  contactEmail: string;
};

export class EmailClientInvitationService implements ClientInvitationService {
  constructor(
    private readonly productEmailSender: ProductEmailSender,
    private readonly options: EmailClientInvitationServiceOptions,
  ) {}

  async sendInvitation(command: SendClientInvitationCommand): Promise<void> {
    const content = createClientInvitationEmailContent({
      acceptUrl: command.acceptUrl,
      coachName: command.coachName,
      contactEmail: this.options.contactEmail,
      firstName: command.firstName,
      variant: command.replacedPendingInvitation ? "replaced" : "first",
    });

    await this.productEmailSender.sendEmail({
      // Deliberately no provider idempotency key. Every send carries a freshly
      // minted token and the stored hash is rotated to match, so a send the
      // provider suppressed as a duplicate would leave the client holding a
      // link whose hash we no longer have — a working invitation that silently
      // stops working. Duplicate rows are already prevented in our own tables.
      html: content.html,
      subject: content.subject,
      text: content.text,
      to: command.to,
    });
  }
}
