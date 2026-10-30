import type { ProductEmailPort } from "~/shared/email/index.server";
import type {
  SendWaitlistConfirmationCommand,
  WaitlistConfirmationPort,
  WaitlistConfirmationResult,
} from "~/bounded-contexts/sales/waitlist/domain/waitlist";

import { createWaitlistConfirmationEmailContent } from "./waitlist-confirmation-email.server";

type EmailWaitlistConfirmationOptions = {
  contactEmail: string;
  privacyEmail: string;
};

export class EmailWaitlistConfirmationAdapter implements WaitlistConfirmationPort {
  constructor(
    private readonly productEmailPort: ProductEmailPort,
    private readonly options: EmailWaitlistConfirmationOptions,
  ) {}

  async sendConfirmation(
    command: SendWaitlistConfirmationCommand,
  ): Promise<WaitlistConfirmationResult> {
    const content = createWaitlistConfirmationEmailContent({
      contactEmail: this.options.contactEmail,
      offer: command.offer,
      pricing: command.pricing,
      privacyEmail: this.options.privacyEmail,
    });
    const delivery = await this.productEmailPort.send({
      html: content.html,
      subject: content.subject,
      text: content.text,
      to: command.email,
    });

    return delivery.kind === "sent" ? { kind: "sent" } : { kind: "failed" };
  }
}
