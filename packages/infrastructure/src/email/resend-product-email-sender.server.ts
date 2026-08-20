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
      const definitiveRejection = isDefinitiveProviderRejection(result.error);

      /**
       * The provider's own reason never reaches the caller, which sees only a
       * delivery status, so a misconfigured sender or unverified domain is
       * otherwise invisible. Recipients are omitted deliberately: they are
       * personal data, and the sender and provider reason are what identify
       * the fault.
       */
      console.debug("Product email provider rejected a send.", {
        definitiveRejection,
        providerErrorMessage: result.error.message,
        providerErrorName: result.error.name,
        providerStatusCode: result.error.statusCode,
        senderAddress: this.options.fromAddress,
      });

      if (definitiveRejection) {
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

/**
 * A rejected sender, an unverified domain, or a bad API key are configuration
 * faults: the identical request is rejected again however often it is retried,
 * so reporting them as retryable asks the caller to wait for something that
 * will never happen. Everything else the provider returns — transport
 * failures, rate limits, its own outages, a key still in flight — can succeed
 * on a later attempt and stays retryable.
 */
const PERMANENT_REJECTION_STATUS_CODES = [400, 401, 403];

function isDefinitiveProviderRejection(error: ErrorResponse): boolean {
  return PERMANENT_REJECTION_STATUS_CODES.some(
    (statusCode) => statusCode === error.statusCode,
  );
}
