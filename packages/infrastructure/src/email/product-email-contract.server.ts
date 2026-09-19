export type EmailAttachment = {
  content: Uint8Array;
  contentType: string;
  filename: string;
};

export type ProductEmailCommand = {
  attachments?: readonly EmailAttachment[];
  html: string;
  idempotencyKey?: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string;
};

export type ProductEmailResult =
  | { kind: "sent"; providerMessageId: string }
  | { kind: "rejected"; reason: string }
  | { kind: "unconfirmed" };

export interface ProductEmail {
  readonly provider: string;
  send(command: ProductEmailCommand): Promise<ProductEmailResult>;
}
