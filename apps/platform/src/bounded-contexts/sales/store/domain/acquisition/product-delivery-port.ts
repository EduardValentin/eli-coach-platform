export type ProductDeliveryResult =
  | { kind: "delivered"; provider: string; providerMessageId: string }
  | { kind: "rejected"; reason: string }
  | { kind: "unconfirmed" };

type ProductDeliveryResource = {
  title: string;
  typeLabels: readonly string[];
};

export interface ProductDeliveryPort {
  readonly provider: string;
  createProviderIdempotencyKey(applicationIdempotencyKey: string): string;
  deliver(command: {
    email: string;
    idempotencyKey: string;
    resources: readonly ProductDeliveryResource[];
    rawToken: string;
    requestedAt: Date;
    requestId: number;
  }): Promise<ProductDeliveryResult>;
}
