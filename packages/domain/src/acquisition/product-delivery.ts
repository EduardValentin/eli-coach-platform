export type ProductDeliveryResult =
  | { kind: "delivered"; provider: string; providerMessageId: string }
  | { kind: "rejected"; reason: string }
  | { kind: "unconfirmed" };

type ProductDeliveryResource = {
  title: string;
  typeLabels: readonly string[];
};

export interface ProductDelivery {
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

export type CreateDownloadTokenResult = {
  rawToken: string;
  sha256: string;
};

export interface DownloadTokenGenerator {
  create(): CreateDownloadTokenResult;
}

export interface PayloadDigestGenerator {
  digest(canonicalPayload: string): string;
}
