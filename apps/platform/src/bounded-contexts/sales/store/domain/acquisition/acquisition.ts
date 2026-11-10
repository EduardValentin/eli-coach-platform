import type { EmailAcceptancePort } from "../email-acceptance-port";
import type { PublishedProduct } from "../product";
import { StoreRecipientEmail } from "../store-recipient-email";

import {
  STORE_DELIVERY_LIMIT_POLICY,
  type DeliveryWindows,
} from "./delivery-limit-policy";

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
    }
  | { status: "paid_products"; paidProductSlugs: readonly string[] };

type AcquisitionRequestProps = {
  recipientEmail: StoreRecipientEmail;
  idempotencyKey: string;
  marketingConsent: boolean;
  productSlugs: readonly string[];
  requestedAt: Date;
  windows: DeliveryWindows;
};

export class AcquisitionRequest {
  readonly recipientEmail: StoreRecipientEmail;
  readonly idempotencyKey: string;
  readonly marketingConsent: boolean;
  readonly productSlugs: readonly string[];
  readonly requestedAt: Date;
  readonly windows: DeliveryWindows;

  private constructor(props: AcquisitionRequestProps) {
    this.recipientEmail = props.recipientEmail;
    this.idempotencyKey = props.idempotencyKey;
    this.marketingConsent = props.marketingConsent;
    this.productSlugs = props.productSlugs;
    this.requestedAt = props.requestedAt;
    this.windows = props.windows;
  }

  static from(
    command: AcquireProductsCommand,
    requestedAt: Date,
    emailAcceptancePort: EmailAcceptancePort,
  ): AcquisitionRequest {
    return new AcquisitionRequest({
      recipientEmail: StoreRecipientEmail.normalized(
        command.email,
        emailAcceptancePort,
      ),
      idempotencyKey: command.idempotencyKey,
      marketingConsent: command.marketingConsent,
      productSlugs: [...new Set(command.productSlugs)].sort(),
      requestedAt,
      windows: STORE_DELIVERY_LIMIT_POLICY.windowsAt(requestedAt),
    });
  }

  get email(): string {
    return this.recipientEmail.address;
  }

  get deliveryLimitKey(): string {
    return this.recipientEmail.deliveryLimitKey();
  }

  canonicalPayload(): string {
    return JSON.stringify({
      email: this.email,
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

    const products = availableProductSlugs.map((slug) =>
      productsBySlug.get(slug)!,
    );
    const paidProductSlugs = products
      .filter((product) => product.isPaid())
      .map((product) => product.slug);

    if (paidProductSlugs.length > 0) {
      return { status: "paid_products", paidProductSlugs };
    }

    return { status: "selected", products };
  }
}
