export type ProductEmailCommand = {
  html: string;
  idempotencyKey?: string;
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
