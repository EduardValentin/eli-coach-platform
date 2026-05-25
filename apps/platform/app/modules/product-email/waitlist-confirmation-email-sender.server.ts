import type { WaitlistConfirmationSender } from "@eli-coach-platform/domain";

import type { ProductEmailSender } from "./product-email-sender.server";

const waitlistConfirmationSubject = "You're on the Eli waitlist";

export class WaitlistConfirmationEmailSender implements WaitlistConfirmationSender {
  constructor(private readonly productEmailSender: ProductEmailSender) {}

  async sendConfirmation(command: { email: string }): Promise<void> {
    await this.productEmailSender.sendEmail({
      html: createWaitlistConfirmationHtml(),
      subject: waitlistConfirmationSubject,
      text: createWaitlistConfirmationText(),
      to: command.email,
    });
  }
}

function createWaitlistConfirmationText(): string {
  return [
    waitlistConfirmationSubject,
    "",
    "Thanks for joining the Eli waitlist. We have your spot and will follow up when access opens.",
  ].join("\n");
}

function createWaitlistConfirmationHtml(): string {
  return [
    "<p>You're on the Eli waitlist.</p>",
    "<p>Thanks for joining. We have your spot and will follow up when access opens.</p>",
  ].join("");
}
