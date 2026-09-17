import type { ProductEmail } from "@eli-coach-platform/domain/shared";
import type {
  SendWaitlistConfirmationCommand,
  WaitlistConfirmationResult,
  WaitlistConfirmationService,
} from "@eli-coach-platform/domain/waitlist";

import { createWaitlistConfirmationEmailContent } from "./waitlist-confirmation-email.server";

type EmailWaitlistConfirmationServiceOptions = {
  contactEmail: string;
  privacyEmail: string;
};

export class EmailWaitlistConfirmationService implements WaitlistConfirmationService {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailWaitlistConfirmationServiceOptions,
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
    const delivery = await this.productEmail.send({
      html: content.html,
      subject: content.subject,
      text: content.text,
      to: command.email,
    });

    return delivery.kind === "sent" ? { kind: "sent" } : { kind: "failed" };
  }
}
