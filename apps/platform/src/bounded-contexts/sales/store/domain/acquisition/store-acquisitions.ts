import type { PublishedProduct } from "../product";

import type { StoreDeliveryLimitWindow } from "./acquisition";

export type PrepareAcquisitionCommand = {
  normalizedEmail: string;
  idempotencyKey: string;
  payloadDigest: string;
  products: readonly PublishedProduct[];
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
  marketingConsent: boolean;
  marketingConsentedAt: Date | null;
  requestedAt: Date;
  expiresAt: Date;
  tokenSha256: string;
  deliveryProvider: string;
  providerIdempotencyKey: string;
  cooldownSince: Date;
  dailyWindowSince: Date;
  dailyLimit: number;
  deliveryLimitKey: string;
};

export type AcquisitionPreparation =
  | {
      status: "created";
      deliveryAttemptId: number;
      deliveryProvider: string;
      providerIdempotencyKey: string;
      requestId: number;
    }
  | {
      status: "replay";
      deliveryStatus: "pending" | "accepted" | "rejected";
      expiresAt: Date;
    }
  | {
      status: "idempotency_conflict";
    }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    }
  | {
      status: "rate_limited";
      window: StoreDeliveryLimitWindow;
    };

/**
 * A prior request resolved by idempotency key. Limit and availability outcomes
 * are decided per attempt, so they can never describe a stored request.
 */
export type ResolvedPriorAcquisition = Exclude<
  AcquisitionPreparation,
  { status: "created" | "rate_limited" | "unavailable_products" }
>;

export interface StoreAcquisitions {
  resolveIdempotency(command: {
    idempotencyKey: string;
    payloadDigest: string;
  }): Promise<ResolvedPriorAcquisition | null>;
  prepareAcquisition(
    command: PrepareAcquisitionCommand,
  ): Promise<AcquisitionPreparation>;
  recordDeliveryAccepted(command: {
    deliveryAttemptId: number;
    requestId: number;
    provider: string;
    providerMessageId: string;
  }): Promise<void>;
  recordDeliveryRejected(command: {
    deliveryAttemptId: number;
    requestId: number;
    provider: string;
  }): Promise<void>;
  recordDeliveryRetryable(command: {
    deliveryAttemptId: number;
    requestId: number;
  }): Promise<void>;
}
