import type {
  CreateEmailOptions,
  CreateEmailResponse,
  ErrorResponse,
} from "resend";

import {
  ProductEmailDeliveryUnconfirmedError,
  ProductEmailRejectedError,
  type ProductEmailSender,
  type SendProductEmailCommand,
  type SendProductEmailResult,
} from "./product-email-sender.server";

type ResendEmailClient = {
  emails: {
    send(
      payload: CreateEmailOptions,
      options?: { idempotencyKey?: string },
    ): Promise<CreateEmailResponse>;
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

  async sendEmail(
    command: SendProductEmailCommand,
  ): Promise<SendProductEmailResult> {
    const payload = {
      from: `${this.options.fromName} <${this.options.fromAddress}>`,
      html: command.html,
      replyTo: this.options.replyTo,
      subject: command.subject,
      text: command.text,
      to: command.to,
    };
    const result = command.idempotencyKey
      ? await this.options.client.emails.send(payload, {
          idempotencyKey: command.idempotencyKey,
        })
      : await this.options.client.emails.send(payload);

    if (result.error) {
      if (isDefinitiveProviderRejection(result.error)) {
        throw new ProductEmailRejectedError();
      }

      throw new ProductEmailDeliveryUnconfirmedError();
    }

    if (!result.data.id) {
      throw new ProductEmailDeliveryUnconfirmedError();
    }

    return { providerMessageId: result.data.id };
  }
}

function isDefinitiveProviderRejection(error: ErrorResponse): boolean {
  return error.name === "validation_error" && error.statusCode === 400;
}
