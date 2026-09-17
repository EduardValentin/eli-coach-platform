import { EmailAddress } from "../email-address";
import type { PublishedProduct } from "../product";

export type StoreDeliveryLimitWindow = "cooldown" | "daily";

export type DeliveryLimitPolicy = {
  cooldownMs: number;
  dailyLimit: number;
  dailyWindowMs: number;
  grantDurationMs: number;
};

export const STORE_DELIVERY_LIMIT_POLICY: DeliveryLimitPolicy = {
  cooldownMs: 60 * 1000,
  dailyLimit: 10,
  dailyWindowMs: 24 * 60 * 60 * 1000,
  grantDurationMs: 7 * 24 * 60 * 60 * 1000,
};

export type DeliveryWindows = {
  cooldownSince: Date;
  dailyWindowSince: Date;
  expiresAt: Date;
};

export type DeliveryUsage = {
  cooldownCount: number;
  dailyCount: number;
};

export function evaluateDeliveryLimit(
  usage: DeliveryUsage,
  dailyLimit: number,
): StoreDeliveryLimitWindow | null {
  if (usage.cooldownCount > 0) {
    return "cooldown";
  }

  return usage.dailyCount >= dailyLimit ? "daily" : null;
}

export type AcquireProductsCommand = {
  email: string;
  idempotencyKey: string;
  marketingConsent: boolean;
  productSlugs: readonly string[];
};

export type ProductSelection =
  | { status: "selected"; products: readonly PublishedProduct[] }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    };

type AcquisitionRequestProps = {
  email: EmailAddress;
  idempotencyKey: string;
  marketingConsent: boolean;
  productSlugs: readonly string[];
  requestedAt: Date;
  windows: DeliveryWindows;
};

export class AcquisitionRequest {
  readonly email: EmailAddress;
  readonly idempotencyKey: string;
  readonly marketingConsent: boolean;
  readonly productSlugs: readonly string[];
  readonly requestedAt: Date;
  readonly windows: DeliveryWindows;

  private constructor(props: AcquisitionRequestProps) {
    this.email = props.email;
    this.idempotencyKey = props.idempotencyKey;
    this.marketingConsent = props.marketingConsent;
    this.productSlugs = props.productSlugs;
    this.requestedAt = props.requestedAt;
    this.windows = props.windows;
  }

  static from(
    command: AcquireProductsCommand,
    requestedAt: Date,
  ): AcquisitionRequest {
    return new AcquisitionRequest({
      email: EmailAddress.normalize(command.email),
      idempotencyKey: command.idempotencyKey,
      marketingConsent: command.marketingConsent,
      productSlugs: [...new Set(command.productSlugs)].sort(),
      requestedAt,
      windows: resolveDeliveryWindows(requestedAt, STORE_DELIVERY_LIMIT_POLICY),
    });
  }

  canonicalPayload(): string {
    return JSON.stringify({
      email: this.email.value,
      marketingConsent: this.marketingConsent,
      productSlugs: this.productSlugs,
    });
  }

  selectProducts(catalog: readonly PublishedProduct[]): ProductSelection {
    const productsBySlug = new Map(
      catalog.map((product) => [product.slug, product]),
    );
    const availableProductSlugs = this.productSlugs.filter((slug) =>
      productsBySlug.has(slug),
    );

    if (availableProductSlugs.length !== this.productSlugs.length) {
      return { status: "unavailable_products", availableProductSlugs };
    }

    return {
      status: "selected",
      products: availableProductSlugs.map((slug) => productsBySlug.get(slug)!),
    };
  }
}

function resolveDeliveryWindows(
  requestedAt: Date,
  policy: DeliveryLimitPolicy,
): DeliveryWindows {
  const time = requestedAt.getTime();

  return {
    cooldownSince: new Date(time - policy.cooldownMs),
    dailyWindowSince: new Date(time - policy.dailyWindowMs),
    expiresAt: new Date(time + policy.grantDurationMs),
  };
}
