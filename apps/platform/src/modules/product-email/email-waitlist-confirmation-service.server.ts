import type {
  SendWaitlistConfirmationCommand,
  WaitlistConfirmationService,
} from "@eli-coach-platform/domain";

import type { ProductEmailSender } from "./product-email-sender.server";
import { createWaitlistConfirmationEmailContent } from "./waitlist-confirmation-email.server";

type EmailWaitlistConfirmationServiceOptions = {
  contactEmail: string;
  privacyEmail: string;
};

export class EmailWaitlistConfirmationService implements WaitlistConfirmationService {
  constructor(
    private readonly productEmailSender: ProductEmailSender,
    private readonly options: EmailWaitlistConfirmationServiceOptions,
  ) {}

  async sendConfirmation(command: SendWaitlistConfirmationCommand): Promise<void> {
    const content = createWaitlistConfirmationEmailContent({
      contactEmail: this.options.contactEmail,
      offer: command.offer,
      pricing: command.pricing,
      privacyEmail: this.options.privacyEmail,
    });

    await this.productEmailSender.sendEmail({
      html: content.html,
      subject: content.subject,
      text: content.text,
      to: command.email,
    });
  }
}
