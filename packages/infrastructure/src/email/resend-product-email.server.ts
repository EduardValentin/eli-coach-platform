import type {
  EmailAttachment,
  ProductEmail,
  ProductEmailCommand,
  ProductEmailResult,
} from "@eli-coach-platform/domain/shared";
import type {
  Attachment,
  CreateEmailOptions,
  CreateEmailResponse,
  ErrorResponse,
} from "resend";

type ResendEmailClient = {
  emails: {
    send(
      payload: CreateEmailOptions,
      options?: { idempotencyKey?: string },
    ): Promise<CreateEmailResponse>;
  };
};

type ResendProductEmailOptions = {
  client: ResendEmailClient;
  fromAddress: string;
  fromName: string;
  replyTo: string;
};

export class ResendProductEmail implements ProductEmail {
  readonly provider = "resend";

  constructor(private readonly options: ResendProductEmailOptions) {}

  async send(command: ProductEmailCommand): Promise<ProductEmailResult> {
    const payload = {
      ...(command.attachments
        ? { attachments: command.attachments.map(toResendAttachment) }
        : {}),
      from: `${this.options.fromName} <${this.options.fromAddress}>`,
      html: command.html,
      replyTo: command.replyTo ?? this.options.replyTo,
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
        return { kind: "rejected", reason: describeRejection(result.error) };
      }

      return { kind: "unconfirmed" };
    }

    if (!result.data.id) {
      return { kind: "unconfirmed" };
    }

    return { kind: "sent", providerMessageId: result.data.id };
  }
}

function toResendAttachment(attachment: EmailAttachment): Attachment {
  return {
    content: Buffer.from(attachment.content),
    contentType: attachment.contentType,
    filename: attachment.filename,
  };
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

/**
 * The provider answers both idempotency faults with 409, and they mean
 * opposite things: a key reused with a different payload is a caller mistake
 * that repeats forever, while a key whose first request is still in flight
 * succeeds once that one settles. Only the first is named here, because status
 * alone cannot tell them apart.
 */
const PERMANENT_REJECTION_ERROR_NAMES = ["invalid_idempotent_request"];

function isDefinitiveProviderRejection(error: ErrorResponse): boolean {
  return (
    PERMANENT_REJECTION_STATUS_CODES.some(
      (statusCode) => statusCode === error.statusCode,
    ) || PERMANENT_REJECTION_ERROR_NAMES.some((name) => name === error.name)
  );
}

/**
 * Recipients are omitted deliberately: they are personal data, and the
 * provider's own category is what identifies a misconfigured sender or an
 * unverified domain to whoever reads the rejection.
 */
function describeRejection(error: ErrorResponse): string {
  return error.name || `status_${error.statusCode}`;
}
