import type {
  SendWaitlistConfirmationCommand,
  WaitlistConfirmationSender,
} from "@eli-coach-platform/domain";

import type { ProductEmailSender } from "./product-email-sender.server";
import { createWaitlistConfirmationEmailContent } from "./waitlist-confirmation-email-template.server";

type WaitlistConfirmationEmailSenderOptions = {
  contactEmail: string;
  privacyEmail: string;
};

export class WaitlistConfirmationEmailSender implements WaitlistConfirmationSender {
  constructor(
    private readonly productEmailSender: ProductEmailSender,
    private readonly options: WaitlistConfirmationEmailSenderOptions,
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
