import type { CreateEmailOptions, CreateEmailResponse } from "resend";

import type { ProductEmailSender, SendProductEmailCommand } from "./product-email-sender.server";

type ResendEmailClient = {
  emails: {
    send(payload: CreateEmailOptions): Promise<CreateEmailResponse>;
  };
};

type ResendProductEmailSenderOptions = {
  client: ResendEmailClient;
  fromAddress: string;
  fromName: string;
  replyTo: string;
};

export class ResendProductEmailSender implements ProductEmailSender {
  constructor(private readonly options: ResendProductEmailSenderOptions) {}

  async sendEmail(command: SendProductEmailCommand): Promise<void> {
    const result = await this.options.client.emails.send({
      from: `${this.options.fromName} <${this.options.fromAddress}>`,
      html: command.html,
      replyTo: this.options.replyTo,
      subject: command.subject,
      text: command.text,
      to: command.to,
    });

    if (result.error) {
      throw new Error("Resend product email send failed.");
    }
  }
}
